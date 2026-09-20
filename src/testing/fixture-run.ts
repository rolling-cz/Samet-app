/**
 * `documents/fixture-platny.xlsx` as an engine run: the config from the workbook
 * plus a made-up set of answers for chapters 1 and 2 (the fixture has none).
 * Shared by the engine tests and `scripts/engine-demo.ts`.
 *
 * Chapter 1: Marie backs Mirek, gets help from both men and joins Srdce party;
 * Antonín keeps working and minds the children; the poll ties; the org marries
 * Marie and Mirek (4 + 6 into the joint account), sets Mirek's `Regime` and
 * Antonín's savings. Chapter 2: the org divorces them again (10 + 6 paid out),
 * Antonín gives Mirek his car, Marie helps the strike fund.
 */
import { readFileSync } from 'node:fs'
import {
  createInitialState,
  evaluate,
  type AnswerInput,
  type EngineConfig,
  type EvaluateResult,
  type RollInput,
} from '@/engine'
import { importXlsx } from '@/import/import-config'
import { toEngineConfig } from '@/import/to-engine-config'

/** Relative to the repository root, where tests and scripts run. */
export const FIXTURE_PATH = 'documents/fixture-platny.xlsx'

export const loadFixtureConfig = (): EngineConfig => {
  const result = importXlsx(readFileSync(FIXTURE_PATH))
  if (!result.usable) {
    throw new Error(`${FIXTURE_PATH} does not import cleanly: ${result.errors.map((issue) => issue.message).join('; ')}`)
  }

  return toEngineConfig(result.config)
}

export const choose = (questionId: string, ...selectedOptionIds: string[]): AnswerInput => ({
  questionId,
  selectedOptionIds,
  filledByOrg: false,
})

/** Org questions (§6.7) are entered by the org. */
export const byOrg = (answer: AnswerInput): AnswerInput => ({ ...answer, filledByOrg: true })

/** `scale_direct` / `resource_direct`: the one option plus the number (§6.7). */
export const setValue = (questionId: string, optionId: string, value: number): AnswerInput =>
  byOrg({ questionId, selectedOptionIds: [optionId], value, filledByOrg: true })

/** A household effect's `{input1}` / `{input2}` (§4.4). */
export const withInputs = (answer: AnswerInput, optionId: string, input1: number, input2: number): AnswerInput => ({
  ...answer,
  inputs: { [optionId]: { input1, input2 } },
})

export const chapter1Answers = (): AnswerInput[] => [
  choose('Q_Marie_1_1', 'A_Marie_1_1_Mirek'),
  choose('Q_Marie_1_2', 'A_Marie_1_2_Antonin', 'A_Marie_1_2_Mirek'),
  choose('Q_Marie_1_3', 'A_Marie_1_3_Ano'),
  choose('Q_Antonin_1_1', 'A_Antonin_1_1_Prace'),
  choose('Q_Antonin_1_2', 'A_Antonin_1_2_Deti'),
  choose('Q_Antonin_1_3', 'A_Group_Funkcionari_Nastupce_Mirek'),
  choose('Q_Antonin_1_4', 'A_Antonin_1_4_Funkcionare'),
  choose('Q_Mirek_1_1', 'A_Group_Funkcionari_Nastupce_Antonin'),
  withInputs(byOrg(choose('Q_Organizatori_1_1', 'A_Organizatori_1_1_Ano')), 'A_Organizatori_1_1_Ano', 4, 6),
  setValue('Q_Organizatori_1_2', 'A_Organizatori_1_2_Nastaveni', 7),
  setValue('Q_Organizatori_1_3', 'A_Organizatori_1_3_Nastaveni', 40),
]

/** The one roll chapter 1 asks for: `V_Marie_1_Historie_1_C` — 80 misses `RANDOM(50)`. */
export const chapter1Rolls = (): RollInput[] => [
  { ownerKind: 'postava', ownerId: 'Marie', variationId: 'V_Marie_1_Historie_1_C', occurrence: 0, value: 80 },
]

/**
 * `Q_Marie_2_2` is not asked (her `Regime` stays at 1), the others are. The
 * joint account holds 16 when the divorce is processed, so 10 + 6 pays it out.
 */
export const chapter2Answers = (): AnswerInput[] => [
  choose('Q_Marie_2_1', 'A_Marie_2_1_Mirek'),
  choose('Q_Marie_2_3', 'A_Marie_2_3_Ano'),
  choose('Q_Antonin_2_1', 'A_Antonin_2_1_Mirek'),
  choose('Q_Antonin_2_2', 'A_Antonin_2_2_Ano'),
  choose('Q_Antonin_2_3', 'A_Antonin_2_3_Nikdo'),
  withInputs(byOrg(choose('Q_Organizatori_2_1', 'A_Organizatori_2_1_Ano')), 'A_Organizatori_2_1_Ano', 10, 6),
]

export interface FixtureRunOptions {
  config?: EngineConfig
  chapter1Answers?: AnswerInput[]
  chapter1Rolls?: RollInput[]
  chapter2Answers?: AnswerInput[]
  chapter2Rolls?: RollInput[]
}

export interface FixtureRun {
  config: EngineConfig
  chapter1: EvaluateResult
  chapter2: EvaluateResult
}

export const runFixture = (options: FixtureRunOptions = {}): FixtureRun => {
  const config = options.config ?? loadFixtureConfig()
  const first = options.chapter1Answers ?? chapter1Answers()
  const chapter1 = evaluate(
    createInitialState(config),
    { chapter: 1, answers: first, rolls: options.chapter1Rolls ?? chapter1Rolls() },
    config,
  )
  const chapter2 = evaluate(
    chapter1.state,
    {
      chapter: 2,
      // Answers accumulate: chapter 2's conditions read chapter 1's answers.
      answers: [...first, ...(options.chapter2Answers ?? chapter2Answers())],
      rolls: [...(options.chapter1Rolls ?? chapter1Rolls()), ...(options.chapter2Rolls ?? [])],
    },
    config,
  )

  return { config, chapter1, chapter2 }
}
