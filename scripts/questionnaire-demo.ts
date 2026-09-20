/**
 * The questionnaire's loop end to end, over `documents/fixture-platny.xlsx` and
 * a real database — every answer goes through the same `saveAnswer` the form's
 * server action calls, never straight into the tables:
 *
 *   1. chapter 1 filled in for everyone → „Vyplněno N / N"
 *   2. computed and confirmed
 *   3. chapter 2 opens: Marie's questions follow the selected variants, the
 *      state under them is the snapshot, the joint account names her partner
 *   4. a divorce whose split does not add up → `payout_mismatch`; fixed → passes
 *   5. an answer entered for the wrong character, then cancelled
 *   6. an edit in a released chapter: needs a reason, touches the chapters after
 *
 *   npx tsx scripts/questionnaire-demo.ts           the whole loop
 *   npx tsx scripts/questionnaire-demo.ts --empty   only the run with its config, to click through by hand
 *
 * Re-runnable: it first drops its own run — allowed only because it is a demo
 * run in a local database.
 */
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { desc, eq } from 'drizzle-orm'
import {
  completionSummary,
  confirmComputation,
  loadChapterCompletion,
  loadQuestionnaire,
  runComputation,
  type QuestionView,
} from '../src/computation'
import { boolOptionLabel } from '../src/computation/constants/bool-options'
import { rawSql, unscopedDb } from '../src/db/client'
import { forRun } from '../src/db/run-scope'
import { auditLog, chapters, computations, runs } from '../src/db/schema'
import type { AnswerInput } from '../src/engine'
import { saveAnswer } from '../src/features/dotaznik/services/save-answer'
import type { AnswerDraft } from '../src/features/dotaznik/types/answer-draft'
import type { SaveAnswerResult } from '../src/features/dotaznik/types/save-answer'
import { EMPTY_DRAFT } from '../src/features/dotaznik/utils/draft-from-answer'
import { importXlsx } from '../src/import/import-config'
import { persistConfig } from '../src/import/persist/persist-config'
import { FIXTURE_PATH, chapter1Answers, chapter2Answers, choose, withInputs } from '../src/testing/fixture-run'
import { wipeRun } from './lib/wipe-run'

const RUN_ID = '2026-01-02_B'
const AUTHOR = 'questionnaire-demo'
const CHAPTER_NUMBERS = [1, 2, 3] as const
const DIVORCE = 'Q_Organizatori_2_1'
const DIVORCE_YES = 'A_Organizatori_2_1_Ano'

const show = (title: string, value: unknown): void => {
  console.log(`\n=== ${title} ===`)
  console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2))
}

const createDemoRun = async (): Promise<void> => {
  await unscopedDb.insert(runs).values({
    id: RUN_ID,
    startDate: '2026-01-02',
    letter: 'B',
    label: 'Ukázka dotazníku (questionnaire-demo)',
    status: 'active',
    createdBy: AUTHOR,
  })
  await unscopedDb.insert(chapters).values(CHAPTER_NUMBERS.map((number) => ({ runId: RUN_ID, number })))

  const content = readFileSync(FIXTURE_PATH)
  const imported = importXlsx(content)
  await persistConfig({
    runId: RUN_ID,
    config: imported.config,
    issues: imported.issues,
    configFile: { filename: 'fixture-platny.xlsx', content },
    templateFiles: [],
    author: AUTHOR,
  })
}

/** What the org's clicks amount to: the form's draft for one engine-style answer. */
const draftOf = (question: QuestionView, input: AnswerInput): AnswerDraft => {
  const inputTexts: AnswerDraft['inputTexts'] = {}
  for (const [optionId, values] of Object.entries(input.inputs ?? {})) {
    inputTexts[optionId] = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value)]))
  }

  if (question.type === 'bool') {
    const chosen = question.options.find((option) => option.id === input.selectedOptionIds[0])

    return { ...EMPTY_DRAFT, boolValue: chosen?.label === boolOptionLabel(true), inputTexts }
  }
  if (input.value !== undefined) return { ...EMPTY_DRAFT, numberText: String(input.value) }

  return { ...EMPTY_DRAFT, selectedOptionIds: input.selectedOptionIds, otherText: input.freeText ?? '', inputTexts }
}

const characterOf = (questionId: string): string => questionId.split('_')[1] ?? ''

const enter = async (chapter: number, input: AnswerInput, reason?: string): Promise<SaveAnswerResult> => {
  const characterId = characterOf(input.questionId)
  const loaded = await loadQuestionnaire(RUN_ID, chapter, characterId)
  if (loaded._type !== 'ready') throw new Error(`chapter ${chapter} cannot be opened`)

  const question = loaded.questionnaire.questions.find((candidate) => candidate.id === input.questionId)
  if (!question) throw new Error(`${input.questionId} is not asked`)

  return saveAnswer(
    { runId: RUN_ID, chapter, characterId, questionId: input.questionId, draft: draftOf(question, input), reason },
    AUTHOR,
  )
}

const enterAll = async (chapter: number, inputs: AnswerInput[]): Promise<void> => {
  for (const input of inputs) {
    const result = await enter(chapter, input)
    if (result._type !== 'saved') throw new Error(`${input.questionId} was not saved: ${JSON.stringify(result)}`)
  }
}

const showCompletion = async (title: string, chapter: number): Promise<void> => {
  const completion = await loadChapterCompletion(RUN_ID, chapter)
  if (completion._type !== 'ready') throw new Error(`chapter ${chapter} cannot be opened`)

  const summary = completionSummary(completion.characters)
  show(title, {
    souhrn: `Vyplněno ${summary.done} / ${summary.total}`,
    postavy: Object.fromEntries(
      completion.characters.map((character) => [
        character.characterId,
        character.askedCount === 0 ? 'bez otázek' : `${character.status} ${character.completeCount}/${character.askedCount}`,
      ]),
    ),
  })
}

const compute = async (chapter: number): Promise<string | undefined> => {
  const outcome = await runComputation({ runId: RUN_ID, chapter, author: AUTHOR })
  if (outcome._type !== 'computed') {
    show(`Přepočet kapitoly ${chapter} se nespustil`, outcome)
    throw new Error(`chapter ${chapter} was not computed: ${outcome._type}`)
  }

  const [stored] = await forRun(RUN_ID).selectColumns(
    computations,
    { conflictsJson: computations.conflictsJson },
    eq(computations.id, outcome.computationId),
  )
  show(`Přepočet kapitoly ${chapter}, verze ${outcome.version}`, {
    konfliktu: outcome.conflictCount,
    konflikty: stored?.conflictsJson,
  })

  return outcome.conflictCount === 0 ? outcome.computationId : undefined
}

const lastAudit = async (count: number) =>
  unscopedDb
    .select({
      action: auditLog.action,
      entityId: auditLog.entityId,
      summary: auditLog.summary,
      valueBefore: auditLog.valueBefore,
      valueAfter: auditLog.valueAfter,
      reason: auditLog.reason,
      author: auditLog.author,
    })
    .from(auditLog)
    .where(eq(auditLog.runId, RUN_ID))
    .orderBy(desc(auditLog.createdAt))
    .limit(count)

const main = async (): Promise<void> => {
  await wipeRun(RUN_ID)
  await createDemoRun()
  if (process.argv.includes('--empty')) {
    console.log(`Běh ${RUN_ID} je připravený s konfigurací z ${FIXTURE_PATH}, bez odpovědí.`)

    return
  }

  // 1
  await showCompletion('1. Kapitola 1 před vyplněním', 1)
  await enterAll(1, chapter1Answers())
  await showCompletion('1. Kapitola 1 po vyplnění', 1)

  // 2
  const first = await compute(1)
  if (first === undefined) throw new Error('chapter 1 has conflicts')
  show('2. Potvrzení kapitoly 1', await confirmComputation({ runId: RUN_ID, computationId: first, author: AUTHOR }))

  // 3
  const marie = await loadQuestionnaire(RUN_ID, 2, 'Marie')
  if (marie._type !== 'ready') throw new Error('chapter 2 cannot be opened')
  show('3. Marie v kapitole 2', {
    otazky: marie.questionnaire.questions.map((question) => question.id),
    stav: marie.questionnaire.state,
    spolecnyUcetS: marie.questionnaire.partners,
  })

  // 4
  await enterAll(2, chapter2Answers().filter((answer) => answer.questionId !== DIVORCE))
  await enterAll(2, [withInputs(choose(DIVORCE, DIVORCE_YES), DIVORCE_YES, 10, 5)])
  console.log('\n4. Rozvod s rozdělením 10 + 5 (na společném účtu je 16):')
  await compute(2)
  await enterAll(2, [withInputs(choose(DIVORCE, DIVORCE_YES), DIVORCE_YES, 10, 6)])
  console.log('\n4. Opraveno na 10 + 6:')
  const second = await compute(2)
  if (second === undefined) throw new Error('chapter 2 still has conflicts')
  await confirmComputation({ runId: RUN_ID, computationId: second, author: AUTHOR })

  // 5
  await showCompletion('5. Kapitola 3 před překlikem', 3)
  await enterAll(3, [choose('Q_Marie_3_1', 'A_Marie_3_1_Ano')])
  await showCompletion('5. Kapitola 3 po odpovědi u špatné postavy', 3)
  const cancelled = await saveAnswer(
    { runId: RUN_ID, chapter: 3, characterId: 'Marie', questionId: 'Q_Marie_3_1', draft: EMPTY_DRAFT },
    AUTHOR,
  )
  show('5. Zrušení odpovědi', { vysledek: cancelled._type, odpoved: cancelled._type === 'saved' ? (cancelled.answer ?? null) : null })
  await showCompletion('5. Kapitola 3 po zrušení', 3)
  show('5. Audit zrušení', (await lastAudit(1))[0])

  // 6
  await forRun(RUN_ID).update(chapters, eq(chapters.number, 1)).set({ status: 'released' })
  const edit = choose('Q_Marie_1_1', 'A_Marie_1_1_Antonin')
  show('6. Úprava ve vydané kapitole bez důvodu', await enter(1, edit).then((result) => result._type))
  const edited = await enter(1, edit, 'Marie odevzdala opravený papír')
  show('6. Úprava s důvodem', { vysledek: edited._type, dotceneKapitoly: edited._type === 'saved' ? edited.touchedChapters : [] })
  show(
    '6. Kapitoly',
    await forRun(RUN_ID).selectColumns(chapters, {
      number: chapters.number,
      status: chapters.status,
      isTouched: chapters.isTouched,
      touchedReason: chapters.touchedReason,
    }),
  )
  show('6. Audit úpravy', (await lastAudit(1))[0])
}

main()
  .then(() => rawSql.end())
  .catch(async (error: unknown) => {
    console.error(error)
    await rawSql.end()
    process.exit(1)
  })
