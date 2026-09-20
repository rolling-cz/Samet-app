/**
 * The runs themselves (§3.2): listing, creating, renaming.
 *
 * The `runs` table is what `run_id` points at, so it cannot be run-scoped — this
 * is how a run gets chosen or made. It lives here so application code never
 * needs `unscopedDb` (architecture rule 2). Everything written *inside* a run
 * (chapters, audit) still goes through `forRun()`.
 */
import { eq } from 'drizzle-orm'
import { runIdFor } from '@/core/constants/run-letters'
import { nextRunLetter } from '@/core/utils/next-run-letter'
import { audit } from '@/locales/cs/audit'
import { errors } from '@/locales/cs/errors'
import { unscopedDb, type Database } from './client'
import { CHAPTER_NUMBERS } from './constants/chapters'
import { isUniqueViolation } from './is-unique-violation'
import { forRun, type RunId } from './run-scope'
import { auditLog, chapters, runs } from './schema'

export type RunSummary = Pick<typeof runs.$inferSelect, 'id' | 'startDate' | 'letter' | 'label' | 'status'>

const SUMMARY_COLUMNS = {
  id: runs.id,
  startDate: runs.startDate,
  letter: runs.letter,
  label: runs.label,
  status: runs.status,
}

/**
 * Two orgs creating a run for the same date at once both pick the same letter;
 * the loser's primary key collides and it simply picks again.
 */
const CREATE_RUN_ATTEMPTS = 3

export const listRuns = async (): Promise<RunSummary[]> =>
  unscopedDb.select(SUMMARY_COLUMNS).from(runs).orderBy(runs.startDate, runs.letter)

export const findRun = async (runId: string): Promise<RunSummary | undefined> => {
  const [run] = await unscopedDb.select(SUMMARY_COLUMNS).from(runs).where(eq(runs.id, runId))

  return run
}

export interface NewRun {
  /** `YYYY-MM-DD`, validated by the caller. */
  startDate: string
  label: string | null
  author: string
}

const insertRun = async (tx: Database, input: NewRun): Promise<RunId> => {
  const existing = await tx
    .select({ startDate: runs.startDate, letter: runs.letter })
    .from(runs)
    .where(eq(runs.startDate, input.startDate))
  const letter = nextRunLetter(existing, input.startDate)
  if (!letter) throw new Error(errors.noFreeRunLetter)

  const id = runIdFor(input.startDate, letter)
  await tx.insert(runs).values({ id, startDate: input.startDate, letter, label: input.label, createdBy: input.author })

  const scope = forRun(id, tx)
  // All three chapters exist from the start, so a config import has somewhere to attach questions.
  await scope.insert(
    chapters,
    CHAPTER_NUMBERS.map((number) => ({ number })),
  )
  await scope.insert(auditLog, {
    action: 'run.create',
    entityKind: 'runs',
    entityId: id,
    summary: audit.runCreated(id, input.label),
    valueAfter: { id, startDate: input.startDate, letter, label: input.label },
    author: input.author,
  })

  return scope.runId
}

/** Generates the ID from the date and the next free letter (§3.2). */
export const createRun = async (input: NewRun): Promise<RunId> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await unscopedDb.transaction((tx) => insertRun(tx as unknown as Database, input))
    } catch (cause) {
      if (!isUniqueViolation(cause) || attempt >= CREATE_RUN_ATTEMPTS) throw cause
    }
  }
}

export interface RunRename {
  runId: string
  label: string | null
  author: string
}

/** Only the descriptive label changes; the ID is referenced everywhere and in export filenames. */
export const renameRun = async ({ runId, label, author }: RunRename): Promise<void> => {
  await unscopedDb.transaction(async (tx) => {
    const [before] = await tx.select({ label: runs.label }).from(runs).where(eq(runs.id, runId)).for('update')
    if (!before) throw new Error(errors.runNotFound(runId))
    if (before.label === label) return

    await tx.update(runs).set({ label }).where(eq(runs.id, runId))
    await forRun(runId, tx as unknown as Database).insert(auditLog, {
      action: 'run.rename',
      entityKind: 'runs',
      entityId: runId,
      summary: audit.runRenamed(runId, before.label, label),
      valueBefore: { label: before.label },
      valueAfter: { label },
      author,
    })
  })
}
