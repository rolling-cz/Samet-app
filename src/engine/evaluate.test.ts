/**
 * The engine over the real fixture (`src/testing/fixture-run.ts`) and over
 * small hand-built workbooks that go through the import first — so every test
 * exercises the same path the app takes: sheet → `ParsedConfig` → engine.
 */
import { describe, expect, it } from 'vitest'
import { importWorkbook } from '@/import/import-config'
import {
  ANSWER_ID_COLUMN,
  ANSWER_LABEL_COLUMN,
  EFFECTS_COLUMN,
  IMPACT_COLUMN,
  QUESTION_CONDITION_COLUMN,
} from '@/import/constants/sheets'
import { buildWorkbook, type Row } from '@/import/testing/build-workbook'
import { toEngineConfig } from '@/import/to-engine-config'
import {
  byOrg,
  chapter1Answers,
  chapter1Rolls,
  chapter2Answers,
  choose,
  runFixture,
  setValue,
  withInputs,
} from '@/testing/fixture-run'
import { createInitialState } from './createInitialState'
import { EngineInputError } from './errors/engineInputError'
import { evaluate } from './evaluate'
import type { EngineConfig } from './types/config'
import type { AnswerInput, RollInput } from './types/input'
import type { TraceEntry } from './types/trace'

const QUESTION_HEADERS = [
  'Character',
  QUESTION_CONDITION_COLUMN,
  'ID',
  'Type',
  'Text',
  ANSWER_ID_COLUMN,
  ANSWER_LABEL_COLUMN,
  IMPACT_COLUMN,
  EFFECTS_COLUMN,
]

const CONTENT_HEADERS = [
  'Character',
  'Block ID',
  'Variation ID',
  'Variation Description',
  'Variation Text',
  'Priority',
  'Conditions',
]

const grid = (headers: string[], rows: Row[]): string[][] => [
  headers,
  ...rows.map((row) => headers.map((column) => row[column] ?? '')),
]

const CHARACTERS: Row[] = [
  { ID: 'Marie', Name: 'Marie', Surname: 'Balážová' },
  { ID: 'Mirek', Name: 'Mirek', Surname: 'Pokorný' },
  { ID: 'Karel', Name: 'Karel', Surname: 'Novák' },
  { ID: 'Org', Name: 'Organizátoři', Surname: '' },
]

const MARRIED_CHARACTERS: Row[] = CHARACTERS.map((row) =>
  row.ID === 'Marie' || row.ID === 'Mirek' ? { ...row, Household: 'MarieMirek' } : row,
)

const RESOURCES: Row[] = [
  { Character: 'Marie', ID: 'R_Marie_Wealth', Scope: 'household', Default: '10' },
  { Character: 'Mirek', ID: 'R_Mirek_Wealth', Scope: 'household', Default: '20' },
  { Character: 'Karel', ID: 'R_Karel_Wealth', Scope: 'household', Default: '30' },
]

const JOINT_RESOURCES: Row[] = [
  ...RESOURCES,
  { Character: 'MarieMirek', ID: 'R_MarieMirek_Wealth', Scope: 'household', Default: '10' },
]

const scales = (regimeDefault: number): Row[] => [
  { Character: 'Marie', ID: 'S_Marie_Regime', Min: '1', Max: '10', Default: String(regimeDefault) },
]

interface Parts {
  characters?: Row[]
  scales?: Row[]
  resources?: Row[]
  questions1: Row[]
  questions2?: Row[]
  content2?: Row[]
}

/** A workbook through the real import; only a usable config reaches the engine. */
const configFrom = (parts: Parts): EngineConfig => {
  const extra: Record<string, string[][]> = { '1_Questions': grid(QUESTION_HEADERS, parts.questions1) }
  if (parts.questions2) extra['2_Questions'] = grid(QUESTION_HEADERS, parts.questions2)
  if (parts.content2) extra['2_Content'] = grid(CONTENT_HEADERS, parts.content2)

  const result = importWorkbook(
    buildWorkbook({
      characters: parts.characters ?? CHARACTERS,
      scales: parts.scales ?? scales(4),
      resources: parts.resources ?? RESOURCES,
      extra,
      omit: [...(parts.questions2 ? [] : ['2_Questions']), ...(parts.content2 ? [] : ['2_Content'])],
    }),
  )
  if (!result.usable) throw new Error(result.errors.map((issue) => issue.message).join('\n'))

  return toEngineConfig(result.config)
}

const marriage = (order = 'Mirek, Marie'): Row => ({
  Character: 'Org',
  ID: 'Q_Org_1_1',
  Type: 'bool',
  Text: 'Sňatek?',
  [ANSWER_LABEL_COLUMN]: 'Ano',
  [EFFECTS_COLUMN]: `HOUSEHOLD_CREATE(${order})`,
})

const divorce = (id = 'Q_Org_1_1', members = 'Marie, Mirek'): Row => ({
  Character: 'Org',
  ID: id,
  Type: 'bool',
  Text: 'Rozvod?',
  [ANSWER_LABEL_COLUMN]: 'Ano',
  [EFFECTS_COLUMN]: `HOUSEHOLD_DELETE(${members})`,
})

const single = (character: string, impact: string, id = `Q_${character}_1_1`): Row => ({
  Character: character,
  ID: id,
  Type: 'single',
  Text: 'Otázka',
  [ANSWER_ID_COLUMN]: `A_${id.slice('Q_'.length)}_X`,
  [ANSWER_LABEL_COLUMN]: 'X',
  [IMPACT_COLUMN]: impact,
})

const run1 = (config: EngineConfig, answers: AnswerInput[], rolls: RollInput[] = []) =>
  evaluate(createInitialState(config), { chapter: 1, answers, rolls }, config)

const ofKind = <K extends TraceEntry['kind']>(trace: TraceEntry[], kind: K) =>
  trace.filter((entry): entry is Extract<TraceEntry, { kind: K }> => entry.kind === kind)

describe('scales', () => {
  it('shifts a scale by the answer and reports it (1)', () => {
    const { chapter1 } = runFixture()

    expect(chapter1.state.characters.Marie?.scales.Control).toBe(6)
    expect(ofKind(chapter1.trace, 'zmena_skaly').find((entry) => entry.scaleKey === 'Control')).toMatchObject({
      characterId: 'Marie',
      before: 5,
      delta: 1,
      after: 6,
      source: { questionId: 'Q_Marie_1_2', optionId: 'A_Marie_1_2_Mirek', characterId: 'Marie' },
    })
  })

  it('applies an absolute setting before any shift, whatever the row order (2)', () => {
    const config = configFrom({
      questions1: [
        single('Marie', 'S_Marie_Regime-2'),
        {
          Character: 'Org',
          ID: 'Q_Org_1_1',
          Type: 'scale_direct',
          Text: 'Nastav',
          [ANSWER_ID_COLUMN]: 'A_Org_1_1_Nastaveni',
          [ANSWER_LABEL_COLUMN]: 'Nová hodnota',
          [IMPACT_COLUMN]: 'S_Marie_Regime=VALUE',
        },
      ],
    })
    const result = run1(config, [choose('Q_Marie_1_1', 'A_Marie_1_1_X'), setValue('Q_Org_1_1', 'A_Org_1_1_Nastaveni', 8)])

    expect(result.state.characters.Marie?.scales.Regime).toBe(6)
    expect(result.trace.map((entry) => entry.kind)).toEqual(['nastaveni_skaly', 'zmena_skaly'])
  })

  it('clamps after every shift and traces each clamp (10)', () => {
    const config = configFrom({ questions1: [single('Marie', 'S_Marie_Regime-2, S_Marie_Regime-2')] })
    const result = run1(config, [choose('Q_Marie_1_1', 'A_Marie_1_1_X')])

    expect(result.state.characters.Marie?.scales.Regime).toBe(1)
    expect(ofKind(result.trace, 'zmena_skaly').map((entry) => [entry.before, entry.raw, entry.after])).toEqual([
      [4, 2, 2],
      [2, 0, 1],
    ])
    expect(ofKind(result.trace, 'orez')).toEqual([expect.objectContaining({ raw: 0, after: 1, bound: 'min' })])
  })

  it('applies shifts in row order, so the same pair gives 2 one way and 1 the other (10)', () => {
    const downThenUp = run1(
      configFrom({ scales: scales(2), questions1: [single('Marie', 'S_Marie_Regime-2, S_Marie_Regime+1')] }),
      [choose('Q_Marie_1_1', 'A_Marie_1_1_X')],
    )
    const upThenDown = run1(
      configFrom({ scales: scales(2), questions1: [single('Marie', 'S_Marie_Regime+1, S_Marie_Regime-2')] }),
      [choose('Q_Marie_1_1', 'A_Marie_1_1_X')],
    )

    expect(downThenUp.state.characters.Marie?.scales.Regime).toBe(2)
    expect(upThenDown.state.characters.Marie?.scales.Regime).toBe(1)
  })

  it('traces changes that cancel out (16)', () => {
    const config = configFrom({ questions1: [single('Marie', 'S_Marie_Regime+2, S_Marie_Regime-2')] })
    const result = run1(config, [choose('Q_Marie_1_1', 'A_Marie_1_1_X')])

    expect(result.state.characters.Marie?.scales.Regime).toBe(4)
    expect(ofKind(result.trace, 'zmena_skaly').map((entry) => entry.delta)).toEqual([2, -2])
  })
})

describe('resources and households', () => {
  it('sends a single character\'s money to the personal account (3)', () => {
    const { chapter2 } = runFixture()
    const gift = ofKind(chapter2.trace, 'zmena_zdroje').find((entry) => entry.source.optionId === 'A_Antonin_2_1_Mirek' && entry.delta === -10)

    expect(gift).toMatchObject({ account: { kind: 'osobni', characterId: 'Antonin' }, routing: 'osobni_svobodna', before: 40, after: 30 })
  })

  it('creates the household alphabetically and routes the same chapter\'s money to it (4, 6)', () => {
    const config = configFrom({
      questions1: [marriage('Mirek, Marie'), single('Marie', 'R_Marie_Wealth+2, R_Marie_Wealth_private+1'), single('Mirek', 'R_Mirek_Wealth+2')],
    })
    const result = run1(config, [
      withInputs(byOrg(choose('Q_Org_1_1', 'A_Org_1_1_Ano')), 'A_Org_1_1_Ano', 3, 5),
      choose('Q_Marie_1_1', 'A_Marie_1_1_X'),
      choose('Q_Mirek_1_1', 'A_Mirek_1_1_X'),
    ])

    expect(result.conflicts).toEqual([])
    expect(result.state.households).toEqual({ MarieMirek: { memberIds: ['Marie', 'Mirek'], resources: { Wealth: 3 + 5 + 2 + 2 } } })
    expect(result.state.characters.Marie).toMatchObject({ householdId: 'MarieMirek', resources: { Wealth: 10 - 5 + 1 } })
    expect(result.state.characters.Mirek).toMatchObject({ householdId: 'MarieMirek', resources: { Wealth: 20 - 3 } })

    const shifts = ofKind(result.trace, 'zmena_zdroje')
    expect(shifts.find((entry) => entry.source.characterId === 'Marie' && entry.delta === 2)).toMatchObject({
      account: { kind: 'domacnost', householdId: 'MarieMirek', memberIds: ['Marie', 'Mirek'] },
      routing: 'spolecny_manzelstvi',
    })
    expect(shifts.find((entry) => entry.delta === 1)).toMatchObject({ account: { kind: 'osobni', characterId: 'Marie' }, routing: 'vynuceny_osobni' })
    expect(shifts.find((entry) => entry.delta === -3)).toMatchObject({
      account: { kind: 'osobni', characterId: 'Mirek' },
      source: { derivedFrom: { raw: 'HOUSEHOLD_CREATE(Mirek, Marie)', inputs: { input1: 3, input2: 5 } } },
    })
  })

  it('adds both spouses\' contributions to the joint account and names each contributor (5)', () => {
    const { chapter2 } = runFixture({
      chapter2Answers: chapter2Answers().map((answer) =>
        answer.questionId === 'Q_Organizatori_2_1' ? byOrg(choose('Q_Organizatori_2_1', 'A_Organizatori_2_1_Ne')) : answer,
      ),
    })

    expect(chapter2.state.households.MarieMirek?.resources.Wealth).toBe(16 + 2 + 10)
    const joint = ofKind(chapter2.trace, 'zmena_zdroje').filter((entry) => entry.account.kind === 'domacnost')
    expect(joint.map((entry) => [entry.source.characterId, entry.delta, entry.before, entry.after])).toEqual([
      ['Marie', 2, 16, 18],
      ['Antonin', 10, 18, 28],
    ])
  })

  it('pays the joint balance out on dissolution and keeps the personal accounts (6)', () => {
    const config = configFrom({ characters: MARRIED_CHARACTERS, resources: JOINT_RESOURCES, questions1: [divorce()] })
    const result = run1(config, [withInputs(byOrg(choose('Q_Org_1_1', 'A_Org_1_1_Ano')), 'A_Org_1_1_Ano', 7, 3)])

    expect(result.conflicts).toEqual([])
    expect(result.state.households).toEqual({})
    expect(result.state.characters.Marie).toEqual({ scales: { Regime: 4 }, resources: { Wealth: 17 } })
    expect(result.state.characters.Mirek).toEqual({ scales: {}, resources: { Wealth: 23 } })
    expect(ofKind(result.trace, 'domacnost_zanik')).toEqual([expect.objectContaining({ householdId: 'MarieMirek', balances: { Wealth: 10 } })])
  })

  it('handles a divorce and a new marriage in one chapter, DELETE before CREATE (7)', () => {
    const config = configFrom({
      characters: MARRIED_CHARACTERS,
      resources: JOINT_RESOURCES,
      // The marriage row comes first in the sheet; the phase order still wins.
      questions1: [
        { ...marriage('Marie, Karel'), ID: 'Q_Org_1_1' },
        divorce('Q_Org_1_2'),
      ],
    })
    const result = run1(config, [
      withInputs(byOrg(choose('Q_Org_1_1', 'A_Org_1_1_Ano')), 'A_Org_1_1_Ano', 2, 4),
      withInputs(byOrg(choose('Q_Org_1_2', 'A_Org_1_2_Ano')), 'A_Org_1_2_Ano', 5, 5),
    ])

    expect(result.conflicts).toEqual([])
    expect(result.state.households).toEqual({ KarelMarie: { memberIds: ['Karel', 'Marie'], resources: { Wealth: 6 } } })
    expect(result.state.characters.Marie).toMatchObject({ householdId: 'KarelMarie', resources: { Wealth: 10 + 5 - 2 } })
    expect(result.state.characters.Mirek).toEqual({ scales: {}, resources: { Wealth: 25 } })
    expect(result.state.characters.Karel).toMatchObject({ householdId: 'KarelMarie', resources: { Wealth: 30 - 4 } })
    expect(result.trace.map((entry) => entry.kind).slice(0, 2)).toEqual(['domacnost_zanik', 'domacnost_vznik'])
  })

  it('returns household conflicts and moves no money for the refused effects (14)', () => {
    const config = configFrom({
      characters: MARRIED_CHARACTERS,
      resources: JOINT_RESOURCES,
      questions1: [{ ...marriage('Marie, Karel'), ID: 'Q_Org_1_1' }, divorce('Q_Org_1_2', 'Karel, Mirek')],
    })
    const result = run1(config, [
      withInputs(byOrg(choose('Q_Org_1_1', 'A_Org_1_1_Ano')), 'A_Org_1_1_Ano', 1, 1),
      withInputs(byOrg(choose('Q_Org_1_2', 'A_Org_1_2_Ano')), 'A_Org_1_2_Ano', 1, 1),
    ])

    expect(result.conflicts).toEqual([
      expect.objectContaining({ kind: 'domacnost_neexistuje', householdId: 'KarelMirek' }),
      expect.objectContaining({ kind: 'uz_v_domacnosti', characterId: 'Marie', currentHouseholdId: 'MarieMirek', householdId: 'KarelMarie' }),
    ])
    expect(result.state.households).toEqual({ MarieMirek: { memberIds: ['Marie', 'Mirek'], resources: { Wealth: 10 } } })
    expect(result.state.characters.Karel?.resources.Wealth).toBe(30)
    expect(result.trace.filter((entry) => entry.kind === 'konflikt')).toHaveLength(2)
  })

  it('reports a dissolution whose inputs do not add up to the balance (14)', () => {
    const config = configFrom({ characters: MARRIED_CHARACTERS, resources: JOINT_RESOURCES, questions1: [divorce()] })
    const result = run1(config, [withInputs(byOrg(choose('Q_Org_1_1', 'A_Org_1_1_Ano')), 'A_Org_1_1_Ano', 7, 7)])

    expect(result.conflicts).toEqual([
      expect.objectContaining({ kind: 'rozdeleni_nesedi', householdId: 'MarieMirek', balance: 10, inputsTotal: 14 }),
    ])
  })

  it('reports a missing input as nedopocitano instead of guessing', () => {
    const config = configFrom({ questions1: [marriage()] })
    const result = run1(config, [byOrg(choose('Q_Org_1_1', 'A_Org_1_1_Ano'))])

    expect(result.conflicts.map((conflict) => conflict.kind)).toEqual(['nedopocitano', 'nedopocitano', 'nedopocitano'])
    expect(result.conflicts[0]).toMatchObject({ missingInputKeys: ['input1'] })
    expect(result.state.characters.Marie?.resources.Wealth).toBe(10)
  })
})

describe('polls', () => {
  const pollQuestions = (): Row[] => [
    { Character: '', ID: 'Q_Poll', Type: 'poll', Text: 'Kdo?', [ANSWER_ID_COLUMN]: 'A_Poll_A', [ANSWER_LABEL_COLUMN]: 'A', [IMPACT_COLUMN]: 'S_Marie_Regime+1' },
    { [ANSWER_ID_COLUMN]: 'A_Poll_B', [ANSWER_LABEL_COLUMN]: 'B', [IMPACT_COLUMN]: 'S_Marie_Regime-1' },
    { Character: 'Marie', Type: 'poll-answer', Text: 'Q_Poll' },
    { Character: 'Mirek', Type: 'poll-answer', Text: 'Q_Poll' },
    { Character: 'Karel', Type: 'poll-answer', Text: 'Q_Poll' },
  ]

  const votes = (marie: string, mirek: string, karel: string): AnswerInput[] => [
    choose('Q_Marie_1_1', marie),
    choose('Q_Mirek_1_1', mirek),
    choose('Q_Karel_1_1', karel),
  ]

  it('lets the most votes win and applies the winner\'s effect once (11)', () => {
    const config = configFrom({ questions1: pollQuestions() })
    const result = run1(config, votes('A_Poll_A', 'A_Poll_B', 'A_Poll_B'))

    expect(ofKind(result.trace, 'anketa')[0]).toMatchObject({ winnerOptionId: 'A_Poll_B', decidedByRowOrder: false })
    expect(result.state.characters.Marie?.scales.Regime).toBe(3)
    expect(ofKind(result.trace, 'zmena_skaly')).toHaveLength(1)
    expect(ofKind(result.trace, 'zmena_skaly')[0]?.source).toMatchObject({ kind: 'anketa', questionId: 'Q_Poll', optionId: 'A_Poll_B' })
  })

  it('breaks a tie by row order and lets a condition read the winner (11)', () => {
    const { chapter1 } = runFixture()

    expect(ofKind(chapter1.trace, 'anketa')[0]).toMatchObject({ winnerOptionId: 'A_Group_Funkcionari_Nastupce_Antonin', decidedByRowOrder: true })
    expect(chapter1.conflicts).toEqual([])
    expect(chapter1.variants.find((variant) => variant.blockId === 'B_Antonin_1_Historie_2')).toMatchObject({ variationId: 'V_Antonin_1_Historie_2_B' })
  })

  it('refuses to run while a voter is missing', () => {
    const config = configFrom({ questions1: pollQuestions() })

    expect(() => run1(config, votes('A_Poll_A', 'A_Poll_B', 'A_Poll_B').slice(0, 2))).toThrow(EngineInputError)
  })
})

describe('variants and question gates', () => {
  it('lets chapter 1 answers gate chapter 2 variants and questions, over the finished state (8)', () => {
    const { chapter1 } = runFixture()
    const gates = Object.fromEntries(chapter1.questions.map((gate) => [gate.questionId, gate.asked]))

    expect(gates).toMatchObject({ Q_Marie_2_1: true, Q_Marie_2_2: false, Q_Marie_2_3: true, Q_Antonin_2_2: true, Q_Antonin_2_3: true })
    // `R_Marie_Wealth >= 7` reads the joint account created this very chapter.
    expect(chapter1.variants.find((variant) => variant.blockId === 'B_Marie_1_Historie_1')).toMatchObject({ variationId: 'V_Marie_1_Historie_1_D', text: '' })
    expect(chapter1.variants.find((variant) => variant.blockId === 'B_Marie_1_Historie_2')).toMatchObject({ variationId: 'V_Marie_1_Historie_2_A' })
  })

  it('shows a value the org set in the same chapter to the next chapter\'s conditions (8)', () => {
    const config = configFrom({
      questions1: [
        { Character: 'Org', ID: 'Q_Org_1_1', Type: 'scale_direct', Text: 'Nastav', [ANSWER_ID_COLUMN]: 'A_Org_1_1_N', [ANSWER_LABEL_COLUMN]: 'N', [IMPACT_COLUMN]: 'S_Marie_Regime=VALUE' },
      ],
      questions2: [{ ...single('Marie', '', 'Q_Marie_2_1'), [QUESTION_CONDITION_COLUMN]: 'S_Marie_Regime >= 5', [ANSWER_ID_COLUMN]: 'A_Marie_2_1_X' }],
      content2: [
        { Character: 'Marie', 'Block ID': 'B_Marie_1_X', 'Variation ID': 'V_A', 'Variation Text': 'Vysoký režim', Priority: '1', Conditions: 'S_Marie_Regime >= 5' },
        { 'Variation ID': 'V_B', 'Variation Text': 'Nízký režim', Priority: '2', Conditions: 'DEFAULT' },
      ],
    })
    const result = run1(config, [setValue('Q_Org_1_1', 'A_Org_1_1_N', 9)])

    expect(result.questions).toEqual([{ questionId: 'Q_Marie_2_1', characterId: 'Marie', asked: true }])
    expect(result.variants).toEqual([{ blockId: 'B_Marie_1_X', characterId: 'Marie', status: 'vybrana', variationId: 'V_A', text: 'Vysoký režim' }])
  })

  it('picks by priority over row order, falls back to DEFAULT and accepts an empty text (9)', () => {
    const { chapter1 } = runFixture()
    const byBlock = Object.fromEntries(chapter1.variants.map((variant) => [variant.blockId, variant]))

    // Row order is C (3), A (1), B (2); A holds and is evaluated first.
    expect(byBlock.B_Antonin_1_Historie_3).toMatchObject({ variationId: 'V_Antonin_1_Historie_3_A' })
    expect(byBlock.B_Antonin_1_Historie_1).toMatchObject({ variationId: 'V_Antonin_1_Historie_1_B', text: 'Pracuje jako vrátný při důchodu.' })
    expect(byBlock.B_Marie_1_Historie_1).toMatchObject({ variationId: 'V_Marie_1_Historie_1_D', text: '' })
    expect(byBlock.B_Marie_1_Questions_1).toMatchObject({ variationId: 'V_Marie_1_Questions_1_A' })
    expect(byBlock.B_Funkcionari_1_Vedeni_1).toMatchObject({ groupId: 'Funkcionari', variationId: 'V_Funkcionari_1_Vedeni_1_B' })
  })

  it('fails loudly on an unknown identifier instead of treating it as false (15)', () => {
    const config = configFrom({
      questions1: [single('Marie', 'S_Marie_Regime+1')],
      questions2: [single('Marie', '', 'Q_Marie_2_1')],
      content2: [
        { Character: 'Marie', 'Block ID': 'B_Marie_1_X', 'Variation ID': 'V_A', 'Variation Text': 'A', Priority: '1', Conditions: 'A_Marie_1_1_X' },
        { 'Variation ID': 'V_B', 'Variation Text': 'B', Priority: '2', Conditions: 'DEFAULT' },
      ],
    })
    const variation = config.blocks[0]?.variations[0]
    if (!variation) throw new Error('fixture has no variation')
    const answers = [choose('Q_Marie_1_1', 'A_Marie_1_1_X')]

    // The true left side would short-circuit a lazy evaluation; the typo must still surface.
    variation.condition = 'A_Marie_1_1_X OR A_Marie_1_1_Neexistuje'
    expect(() => run1(config, answers)).toThrow(/neznamy_identifikator.*A_Marie_1_1_Neexistuje/)

    variation.condition = 'S_Marie_Regme >= 3'
    expect(() => run1(config, answers)).toThrow(/neznamy_identifikator.*S_Marie_Regme/)

    variation.condition = 'RANDOM(50)'
    config.questions[1]!.condition = 'RANDOM(50)'
    expect(() => run1(config, answers)).toThrow(/random_v_otazce/)
  })
})

describe('randomness', () => {
  it('asks for the roll it lacks, then uses the stored one and never re-rolls (12)', () => {
    const withoutRoll = runFixture({ chapter1Rolls: [] })
    expect(withoutRoll.chapter1.missingRolls).toEqual([
      { ownerKind: 'postava', ownerId: 'Marie', variationId: 'V_Marie_1_Historie_1_C', occurrence: 0, percent: 50 },
    ])
    expect(withoutRoll.chapter1.variants.find((variant) => variant.blockId === 'B_Marie_1_Historie_1')).toMatchObject({ status: 'nerozhodnuto', variationId: null })

    const hit = runFixture({ chapter1Rolls: [{ ...chapter1Rolls()[0]!, value: 20 }] })
    expect(hit.chapter1.missingRolls).toEqual([])
    expect(hit.chapter1.variants.find((variant) => variant.blockId === 'B_Marie_1_Historie_1')).toMatchObject({ variationId: 'V_Marie_1_Historie_1_C' })

    const miss = runFixture()
    expect(miss.chapter1.variants.find((variant) => variant.blockId === 'B_Marie_1_Historie_1')).toMatchObject({ variationId: 'V_Marie_1_Historie_1_D' })
  })

  it('gives every RANDOM its own roll, so two of them make 25 % and not 50 % (12)', () => {
    const config = configFrom({
      questions1: [single('Marie', 'S_Marie_Regime+1')],
      questions2: [single('Marie', '', 'Q_Marie_2_1')],
      content2: [
        { Character: 'Marie', 'Block ID': 'B_Marie_1_X', 'Variation ID': 'V_A', 'Variation Text': 'A', Priority: '1', Conditions: 'RANDOM(50) AND RANDOM(50)' },
        { 'Variation ID': 'V_B', 'Variation Text': 'B', Priority: '2', Conditions: 'DEFAULT' },
      ],
    })
    const answers = [choose('Q_Marie_1_1', 'A_Marie_1_1_X')]
    const roll = (occurrence: number, value: number): RollInput => ({ ownerKind: 'postava', ownerId: 'Marie', variationId: 'V_A', occurrence, value })

    expect(run1(config, answers).missingRolls.map((request) => request.occurrence)).toEqual([0, 1])
    expect(run1(config, answers, [roll(0, 30)]).missingRolls.map((request) => request.occurrence)).toEqual([1])
    expect(run1(config, answers, [roll(0, 30), roll(1, 30)]).variants[0]).toMatchObject({ variationId: 'V_A' })
    expect(run1(config, answers, [roll(0, 30), roll(1, 70)]).variants[0]).toMatchObject({ variationId: 'V_B' })
    // A miss on the first roll settles it without the second.
    expect(run1(config, answers, [roll(0, 70)]).missingRolls).toEqual([])
  })
})

describe('purity', () => {
  it('gives byte-identical output for the same input and leaves the input alone (13)', () => {
    const first = runFixture()
    const second = runFixture()

    expect(JSON.stringify(second)).toBe(JSON.stringify(first))
    const initial = createInitialState(first.config)
    const frozen = JSON.stringify(initial)
    evaluate(initial, { chapter: 1, answers: chapter1Answers(), rolls: chapter1Rolls() }, first.config)
    expect(JSON.stringify(initial)).toBe(frozen)
  })

  it('refuses a missing answer and an answer to a question that was not asked', () => {
    const { chapter1, config } = runFixture()
    const chapter2 = (answers: AnswerInput[]) =>
      evaluate(chapter1.state, { chapter: 2, answers: [...chapter1Answers(), ...answers], rolls: chapter1Rolls() }, config)

    expect(() => chapter2(chapter2Answers().slice(1))).toThrow(/chybi_odpoved Q_Marie_2_1/)
    expect(() => chapter2([...chapter2Answers(), choose('Q_Marie_2_2', 'A_Marie_2_2_Ano')])).toThrow(/never asked/)
  })
})
