import { eq } from 'drizzle-orm'
import { forRun } from '@/db'
import { auditLog, chapters, computations } from '@/db/schema'
import { audit } from '@/locales/cs/audit'
import { COMPUTATION_AUDIT_ACTIONS } from '../constants/audit-actions'

export interface ConfirmationRequest {
  runId: string
  computationId: string
  author: string
}

export type ConfirmationOutcome =
  | { _type: 'confirmed'; chapter: number; version: number }
  | { _type: 'not_found' }
  | { _type: 'already_confirmed' }
  /** A conflict is the org's to settle, never the code's (§7.3). */
  | { _type: 'has_conflicts'; conflictCount: number }

/**
 * Makes a draft the computation the next chapter may start from. Releasing the
 * chapter is a separate step that comes with the outputs.
 */
export const confirmComputation = (request: ConfirmationRequest): Promise<ConfirmationOutcome> =>
  forRun(request.runId).transaction(async (scope): Promise<ConfirmationOutcome> => {
    const [computation] = await scope.selectColumns(
      computations,
      {
        chapterId: computations.chapterId,
        version: computations.version,
        status: computations.status,
        conflictsJson: computations.conflictsJson,
      },
      eq(computations.id, request.computationId),
    )
    if (!computation) return { _type: 'not_found' }
    if (computation.status === 'confirmed') return { _type: 'already_confirmed' }

    const conflictCount = Array.isArray(computation.conflictsJson) ? computation.conflictsJson.length : 0
    if (conflictCount > 0) return { _type: 'has_conflicts', conflictCount }

    const [chapter] = await scope.selectColumns(
      chapters,
      { number: chapters.number, status: chapters.status },
      eq(chapters.id, computation.chapterId),
    )
    if (!chapter) return { _type: 'not_found' }

    await scope
      .update(computations, eq(computations.id, request.computationId))
      .set({ status: 'confirmed', confirmedAt: new Date(), confirmedBy: request.author })
    // A released chapter stays released; confirming a recomputation does not take the papers back.
    if (chapter.status === 'in_progress') {
      await scope.update(chapters, eq(chapters.id, computation.chapterId)).set({ status: 'computed' })
    }

    await scope.insert(auditLog, {
      chapterId: computation.chapterId,
      action: COMPUTATION_AUDIT_ACTIONS.confirm,
      entityKind: 'computations',
      entityId: request.computationId,
      summary: audit.computationConfirmed(scope.runId, chapter.number, computation.version),
      valueBefore: { status: 'draft' },
      valueAfter: { status: 'confirmed' },
      computationId: request.computationId,
      author: request.author,
    })

    return { _type: 'confirmed', chapter: chapter.number, version: computation.version }
  })
