/**
 * The computation core end to end, over `documents/fixture-platny.xlsx` and a
 * real database: imports the fixture into a run of its own, enters the made-up
 * answers of `src/testing/fixture-run.ts`, computes chapter 1 **through the
 * core** (never `evaluate` directly), confirms it, and reads Marie's state and
 * questions for chapter 2 back from the database. Then the same for chapter 2.
 *
 * The result must agree with `scripts/engine-demo.ts`; the script checks that
 * itself against the engine-only run and fails when it does not.
 *
 *   npx tsx scripts/compute-demo.ts
 *
 * Re-runnable: it first drops its own run — allowed only because it is a demo
 * run in a local database.
 */
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'
import {
  confirmComputation,
  loadAskedQuestions,
  loadCharacterState,
  loadComputationBlockers,
  runComputation,
} from '../src/computation'
import { buildIdDirectory } from '../src/computation/convert/build-id-directory'
import { characterStateView } from '../src/computation/convert/character-state-view'
import { loadConfigRows } from '../src/computation/services/load-config-rows'
import { answersToRows } from '../src/computation/testing/answers-to-rows'
import { DICE_SIDES } from '../src/computation/constants/dice'
import { rawSql, unscopedDb } from '../src/db/client'
import { forRun } from '../src/db/run-scope'
import { answerInputValues, answerSelectedOptions, answers, chapters, diceRolls, runs } from '../src/db/schema'
import type { AnswerInput, RollInput, RunState } from '../src/engine'
import { importXlsx } from '../src/import/import-config'
import { persistConfig } from '../src/import/persist/persist-config'
import {
  FIXTURE_PATH,
  chapter1Answers,
  chapter1Rolls,
  chapter2Answers,
  runFixture,
} from '../src/testing/fixture-run'
import { wipeRun } from './lib/wipe-run'

const RUN_ID = '2026-01-01_A'
const AUTHOR = 'compute-demo'
const CHARACTER = 'Marie'
const CHAPTER_NUMBERS = [1, 2, 3] as const

const show = (title: string, value: unknown): void => {
  console.log(`\n=== ${title} ===`)
  console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2))
}

const createDemoRun = async (): Promise<void> => {
  await unscopedDb.insert(runs).values({
    id: RUN_ID,
    startDate: '2026-01-01',
    letter: 'A',
    label: 'Ukázka přepočtu (compute-demo)',
    status: 'active',
    createdBy: AUTHOR,
  })
  await unscopedDb.insert(chapters).values(CHAPTER_NUMBERS.map((number) => ({ runId: RUN_ID, number })))
}

const importFixture = async (): Promise<void> => {
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

/** What the questionnaire will do in session 5: one `answers` row per question, plus its options and `{input}` values. */
const enterAnswers = async (inputs: AnswerInput[]): Promise<void> => {
  const scope = forRun(RUN_ID)
  const config = await loadConfigRows(scope)
  const rows = answersToRows(inputs, config, buildIdDirectory(config))

  for (const { id: draftId, ...answer } of rows.answers) {
    const [stored] = await scope
      .insert(answers, { ...answer, filledByOrg: true, answeredBy: AUTHOR })
      .returning({ id: answers.id })
    if (!stored) throw new Error(`answer to ${answer.questionId} was not stored`)

    const answerId = stored.id
    const selected = rows.selectedOptions.filter((row) => row.answerId === draftId)
    const typed = rows.inputValues.filter((row) => row.answerId === draftId)
    if (selected.length > 0) await scope.insert(answerSelectedOptions, selected.map((row) => ({ ...row, answerId })))
    if (typed.length > 0) await scope.insert(answerInputValues, typed.map((row) => ({ ...row, answerId })))
  }
}

/**
 * The core would roll for real and the result would differ from run to run. To
 * be comparable with `engine-demo.ts` the fixture's roll is stored up front —
 * exactly what a manual override by the org will do — and the core must not
 * roll it again.
 */
const storeFixtureRolls = async (rolls: RollInput[]): Promise<void> => {
  const scope = forRun(RUN_ID)
  const directory = buildIdDirectory(await loadConfigRows(scope))

  await scope.insert(
    diceRolls,
    rolls.map((roll) => ({
      blockVariationId: directory.variations.toDb(roll.variationId),
      occurrence: roll.occurrence,
      sides: DICE_SIDES,
      value: roll.value,
      isManualOverride: true,
      rolledBy: AUTHOR,
      reason: 'fixture roll, to match scripts/engine-demo.ts',
    })),
  )
}

const computeAndConfirm = async (chapter: number): Promise<void> => {
  show(`Co brání přepočtu kapitoly ${chapter}`, await loadComputationBlockers(RUN_ID, chapter))

  const outcome = await runComputation({ runId: RUN_ID, chapter, author: AUTHOR })
  if (outcome._type !== 'computed') {
    show(`Přepočet kapitoly ${chapter} se nespustil`, outcome)
    throw new Error(`chapter ${chapter} was not computed: ${outcome._type}`)
  }
  show(`Přepočet kapitoly ${chapter}`, {
    verze: outcome.version,
    konfliktu: outcome.conflictCount,
    noveHozeneKostky: outcome.newRolls,
    inputHash: outcome.inputHash,
  })

  show(
    `Potvrzení přepočtu kapitoly ${chapter}`,
    await confirmComputation({ runId: RUN_ID, computationId: outcome.computationId, author: AUTHOR }),
  )
}

/** Marie before `chapter`, read from the database, against the engine-only run. */
const checkAgainstEngine = async (chapter: number, expectedState: RunState, expectedQuestions: string[]): Promise<void> => {
  const state = await loadCharacterState(RUN_ID, chapter, CHARACTER)
  const asked = await loadAskedQuestions(RUN_ID, chapter, CHARACTER)
  if (state._type !== 'ready' || asked._type !== 'ready') throw new Error(`chapter ${chapter} cannot be opened`)

  const askedIds = asked.questions.map((question) => question.externalId)
  show(`Stav ${CHARACTER} před kapitolou ${chapter} (z databáze)`, state.state)
  show(`Otázky, které se ${CHARACTER} položí v kapitole ${chapter}`, askedIds)

  const scope = forRun(RUN_ID)
  const config = await loadConfigRows(scope)
  const expected = characterStateView(expectedState, CHARACTER, config, buildIdDirectory(config))
  if (!isDeepStrictEqual(state.state, expected)) {
    show('Engine čekal', expected)
    throw new Error(`state before chapter ${chapter} differs from the engine-only run`)
  }
  if (!isDeepStrictEqual([...askedIds].sort(), [...expectedQuestions].sort())) {
    show('Engine čekal otázky', expectedQuestions)
    throw new Error(`questions of chapter ${chapter} differ from the engine-only run`)
  }
  console.log(`\n✓ kapitola ${chapter}: stav i otázky sedí s enginem (scripts/engine-demo.ts)`)
}

const askedOf = (gates: { questionId: string; characterId?: string; asked: boolean }[]): string[] =>
  gates.filter((gate) => gate.asked && gate.characterId === CHARACTER).map((gate) => gate.questionId)

const main = async (): Promise<void> => {
  const engineOnly = runFixture()

  await wipeRun(RUN_ID)
  await createDemoRun()
  await importFixture()
  show('Kapitola 2 před přepočtem kapitoly 1', await loadAskedQuestions(RUN_ID, 2, CHARACTER))

  await enterAnswers(chapter1Answers())
  await storeFixtureRolls(chapter1Rolls())
  await computeAndConfirm(1)
  await checkAgainstEngine(2, engineOnly.chapter1.state, askedOf(engineOnly.chapter1.questions))

  await enterAnswers(chapter2Answers())
  await computeAndConfirm(2)
  await checkAgainstEngine(3, engineOnly.chapter2.state, askedOf(engineOnly.chapter2.questions))

  await rawSql.end()
}

main().catch(async (error: unknown) => {
  console.error(error)
  await rawSql.end()
  process.exit(1)
})
