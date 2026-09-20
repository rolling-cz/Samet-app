import { describe, expect, it } from 'vitest'
import {
  compareIds,
  createInitialState,
  EngineInputError,
  evaluate,
  type AnswerInput,
  type EngineProblem,
  type EvaluateResult,
  type RollInput,
} from '@/engine'
import { chapter1Answers, chapter1Rolls, chapter2Answers, loadFixtureConfig, runFixture } from '@/testing/fixture-run'
import { answersFromRows } from './convert/answers-from-rows'
import { askedQuestions } from './convert/asked-questions'
import { buildIdDirectory } from './convert/build-id-directory'
import { characterStateView } from './convert/character-state-view'
import { initialStateFromRows } from './convert/initial-state-from-rows'
import { inputHash } from './convert/input-hash'
import { pickBaseline } from './convert/pick-baseline'
import { resolveRolls } from './convert/resolve-rolls'
import { rollsFromRows } from './convert/rolls-from-rows'
import { snapshotToState } from './convert/snapshot-to-state'
import { splitEngineProblems } from './convert/split-engine-problems'
import { householdsToCreate, stateToSnapshot } from './convert/state-to-snapshot'
import { unansweredQuestions } from './convert/unanswered-questions'
import { RollLoopError } from './errors/rollLoopError'
import { UnknownIdError } from './errors/unknownIdError'
import { answersToRows } from './testing/answers-to-rows'
import { fakeConfigRows, fakeDbId } from './testing/fake-config-rows'

const MARRIED = 'MarieMirek'

const config = loadFixtureConfig()
const fixture = runFixture({ config })
const rows = fakeConfigRows(config, [MARRIED])
const directory = buildIdDirectory(rows)

const byQuestion = (a: AnswerInput, b: AnswerInput): number => compareIds(a.questionId, b.questionId)

const answerTo = (answers: AnswerInput[], questionId: string): AnswerInput | undefined =>
  answers.find((answer) => answer.questionId === questionId)

describe('ID directory', () => {
  it('maps both ways', () => {
    expect(directory.characters.toDb('Marie')).toBe(fakeDbId('character', 'Marie'))
    expect(directory.characters.toExternal(fakeDbId('character', 'Marie'))).toBe('Marie')
    expect(directory.chapters.toExternal(fakeDbId('chapter', 2))).toBe(2)
  })

  it('fails loudly on an unknown ID in either direction', () => {
    expect(() => directory.characters.toDb('Marrie')).toThrow(UnknownIdError)
    expect(() => directory.questions.toExternal('no-such-row')).toThrow(UnknownIdError)
  })

  it('refuses a state naming a scale the database does not have, instead of dropping the row', () => {
    const state = structuredClone(fixture.chapter1.state)
    const marie = state.characters.Marie
    if (marie) marie.scales.Regme = 3

    expect(() => stateToSnapshot(state, [], directory)).toThrow(UnknownIdError)
  })

  it('refuses a snapshot row pointing at a character the config does not know', () => {
    const snapshot = stateToSnapshot(fixture.chapter1.state, fixture.chapter1.trace, directory)
    snapshot.resourceValues.push({ characterId: 'no-such-row', resourceId: fakeDbId('resource', 'Wealth'), value: 1 })

    expect(() => snapshotToState(snapshot, 1, directory)).toThrow(UnknownIdError)
  })

  it('files a variant under the owner of its block', () => {
    const placement = directory.placements.get(fakeDbId('variation', 'V_Marie_1_Historie_1_C'))

    expect(placement?.owner).toEqual({ ownerKind: 'character', ownerId: 'Marie' })
  })
})

describe('state conversions', () => {
  it('reads the same starting state from the config rows as the engine does from the workbook', () => {
    expect(initialStateFromRows(rows, directory)).toEqual(createInitialState(config))
  })

  it.each([
    ['chapter 1 (a household founded, variants selected)', fixture.chapter1, 1],
    ['chapter 2 (the household dissolved again)', fixture.chapter2, 2],
  ])('state → snapshot rows → state is the identity: %s', (_name, result, chapter) => {
    const snapshot = stateToSnapshot(result.state, result.trace, directory)

    expect(snapshotToState(snapshot, chapter, directory)).toEqual(result.state)
  })

  it('carries the whole run\'s selected variants, one per block', () => {
    const snapshot = stateToSnapshot(fixture.chapter2.state, fixture.chapter2.trace, directory)
    const blockIds = snapshot.selectedVariations.map((row) => row.blockId)

    expect(new Set(blockIds).size).toBe(blockIds.length)
    expect(blockIds.length).toBeGreaterThan(
      stateToSnapshot(fixture.chapter1.state, fixture.chapter1.trace, directory).selectedVariations.length,
    )
  })

  it('names the households a computation founded', () => {
    const known = buildIdDirectory(fakeConfigRows(config))

    expect(householdsToCreate(fixture.chapter1.state, known)).toEqual([MARRIED])
    expect(householdsToCreate(fixture.chapter1.state, directory)).toEqual([])
  })

  it('records a clamped scale with its raw value', () => {
    const clamp = fixture.chapter1.trace.find((entry) => entry.kind === 'clamp')
    expect(clamp, 'the fixture is expected to clamp a scale in chapter 1').toBeDefined()
    if (clamp?.kind !== 'clamp') return

    const snapshot = stateToSnapshot(fixture.chapter1.state, fixture.chapter1.trace, directory)
    const row = snapshot.scaleValues.find(
      (candidate) =>
        candidate.characterId === fakeDbId('character', clamp.characterId) &&
        candidate.scaleId === fakeDbId('scale', clamp.scaleKey),
    )

    expect(row?.wasClamped).toBe(true)
    expect(row?.rawValue).toBe(clamp.raw)
    expect(row?.rawValue).not.toBe(row?.value)

    const untouched = snapshot.scaleValues.filter((candidate) => !candidate.wasClamped)
    expect(untouched.length).toBeGreaterThan(0)
    expect(untouched.every((candidate) => candidate.rawValue === null)).toBe(true)
  })

  it('shows a character their scales with bounds and who they share the joint account with', () => {
    const view = characterStateView(fixture.chapter1.state, 'Marie', rows, directory)
    const regime = config.scales.find((scale) => scale.externalId === 'S_Marie_Regime')

    expect(view.scales.find((scale) => scale.externalId === 'S_Marie_Regime')).toMatchObject({
      min: regime?.min,
      max: regime?.max,
      value: fixture.chapter1.state.characters.Marie?.scales.Regime,
    })
    expect(view.household).toMatchObject({ householdId: MARRIED, partnerIds: ['Mirek'] })
    expect(view.household?.resources).toEqual([
      { key: 'Wealth', label: expect.any(String), value: fixture.chapter1.state.households[MARRIED]?.resources.Wealth },
    ])
    expect(characterStateView(fixture.chapter1.state, 'Antonin', rows, directory).household).toBeUndefined()
  })
})

describe('answers', () => {
  const entered = answersToRows([...chapter1Answers(), ...chapter2Answers()], rows, directory)

  it('converts every stored answer of the fixture back to what the engine was given', () => {
    expect(answersFromRows(entered, rows, directory, 2)).toEqual([...chapter1Answers(), ...chapter2Answers()].sort(byQuestion))
  })

  it('leaves out the chapters after the one being computed', () => {
    expect(answersFromRows(entered, rows, directory, 1)).toEqual(chapter1Answers().sort(byQuestion))
  })

  it('gives the engine an input it accepts', () => {
    const answers = answersFromRows(entered, rows, directory, 1)
    const result = evaluate(createInitialState(config), { chapter: 1, answers, rolls: chapter1Rolls() }, config)

    expect(result.state).toEqual(fixture.chapter1.state)
  })

  const converted = answersFromRows(entered, rows, directory, 2)

  it('bool: the stored boolean becomes the `Ano` / `Ne` option', () => {
    expect(answerTo(converted, 'Q_Marie_1_3')?.selectedOptionIds).toEqual(['A_Marie_1_3_Ano'])

    const no = structuredClone(entered)
    for (const answer of no.answers) if (answer.boolValue !== null) answer.boolValue = false
    expect(answerTo(answersFromRows(no, rows, directory, 2), 'Q_Marie_1_3')?.selectedOptionIds).toEqual(['A_Marie_1_3_Ne'])
  })

  it('single and multi: the selected options, in row order', () => {
    expect(answerTo(converted, 'Q_Marie_1_1')?.selectedOptionIds).toEqual(['A_Marie_1_1_Mirek'])
    expect(answerTo(converted, 'Q_Marie_1_2')?.selectedOptionIds).toEqual(['A_Marie_1_2_Antonin', 'A_Marie_1_2_Mirek'])
  })

  it('multi with `_OTHER_`: the free text comes along', () => {
    const withOther = answersToRows(
      [{ questionId: 'Q_Marie_1_2', selectedOptionIds: ['A_Marie_1_2_Other'], freeText: 'sousedka' }],
      rows,
      directory,
    )

    expect(answersFromRows(withOther, rows, directory, 1)).toEqual([
      { questionId: 'Q_Marie_1_2', selectedOptionIds: ['A_Marie_1_2_Other'], freeText: 'sousedka' },
    ])
  })

  it('poll-answer: the vote names the poll\'s option', () => {
    expect(answerTo(converted, 'Q_Antonin_1_3')?.selectedOptionIds).toEqual(['A_Group_Funkcionari_Nastupce_Mirek'])
  })

  it('scale_direct and resource_direct: the number plus the question\'s one option', () => {
    expect(answerTo(converted, 'Q_Organizatori_1_2')).toEqual({
      questionId: 'Q_Organizatori_1_2',
      selectedOptionIds: ['A_Organizatori_1_2_Nastaveni'],
      value: 7,
    })
    expect(answerTo(converted, 'Q_Organizatori_1_3')).toMatchObject({
      selectedOptionIds: ['A_Organizatori_1_3_Nastaveni'],
      value: 40,
    })
  })

  it('`{input1}` / `{input2}`: the typed numbers, per option', () => {
    expect(answerTo(converted, 'Q_Organizatori_1_1')?.inputs).toEqual({ A_Organizatori_1_1_Ano: { input1: 4, input2: 6 } })
  })

  it('repairs nothing: an answer without a value reaches the engine without an option', () => {
    const empty = structuredClone(entered)
    for (const answer of empty.answers) answer.boolValue = null
    empty.selectedOptions = []

    expect(answerTo(answersFromRows(empty, rows, directory, 1), 'Q_Marie_1_3')?.selectedOptionIds).toEqual([])
    expect(answerTo(answersFromRows(empty, rows, directory, 1), 'Q_Marie_1_1')?.selectedOptionIds).toEqual([])
  })

  it('fails on an answer to a question the config rows do not have', () => {
    const stray = structuredClone(entered)
    const first = stray.answers[0]
    if (first) first.questionId = 'no-such-row'

    expect(() => answersFromRows(stray, rows, directory, 2)).toThrow(UnknownIdError)
  })
})

describe('asked questions', () => {
  const selectedAfterChapter1 = new Set(
    stateToSnapshot(fixture.chapter1.state, fixture.chapter1.trace, directory).selectedVariations.map(
      (row) => row.blockVariationId,
    ),
  )

  it('chapter 2 asks exactly what the engine gated when chapter 1 was computed', () => {
    const asked = askedQuestions(rows.questions, fakeDbId('chapter', 2), selectedAfterChapter1).map((question) => question.externalId)
    const gated = fixture.chapter1.questions.filter((gate) => gate.asked).map((gate) => gate.questionId)

    expect(asked.sort(compareIds)).toEqual(gated.sort(compareIds))
    expect(asked).not.toContain('Q_Marie_2_2')
  })

  it('chapter 1 asks every question of a character, a vote included, and never the poll itself', () => {
    const asked = askedQuestions(rows.questions, fakeDbId('chapter', 1), new Set()).map((question) => question.externalId)

    expect(asked).toContain('Q_Antonin_1_3')
    expect(asked).not.toContain('Q_Group_Funkcionari_Nastupce')
    expect(asked).toHaveLength(config.questions.filter((question) => question.chapter === 1 && question.type !== 'poll').length)
  })

  it('lists what is asked and not answered', () => {
    const asked = askedQuestions(rows.questions, fakeDbId('chapter', 1), new Set()).map((question) => ({
      ...question,
      characterExternalId: directory.characters.toExternal(question.characterId ?? ''),
    }))
    const answered = new Set(asked.filter((question) => question.externalId !== 'Q_Mirek_1_1').map((question) => question.id))

    expect(unansweredQuestions(asked, answered, 1)).toEqual([{ questionId: 'Q_Mirek_1_1', characterId: 'Mirek', chapter: 1 }])
  })
})

describe('baseline computation', () => {
  const draft = { id: 'c3', version: 3, status: 'draft' as const, isReleased: false }
  const confirmed1 = { id: 'c1', version: 1, status: 'confirmed' as const, isReleased: false }
  const confirmed2 = { id: 'c2', version: 2, status: 'confirmed' as const, isReleased: false }

  it('is never a draft', () => {
    expect(pickBaseline([draft])).toBeUndefined()
    expect(pickBaseline([])).toBeUndefined()
  })

  it('is the last confirmed computation', () => {
    expect(pickBaseline([confirmed2, draft, confirmed1])?.id).toBe('c2')
  })

  it('is the released one when there is one, even if a later version was confirmed', () => {
    expect(pickBaseline([{ ...confirmed1, isReleased: true }, confirmed2])?.id).toBe('c1')
  })
})

describe('missing answers', () => {
  it('turns the engine\'s refusal into a list per character, and keeps other problems apart', () => {
    const withoutMirek = chapter1Answers().filter((answer) => answer.questionId !== 'Q_Mirek_1_1')
    let problems: EngineProblem[] = []
    try {
      evaluate(createInitialState(config), { chapter: 1, answers: withoutMirek, rolls: [] }, config)
    } catch (cause) {
      if (cause instanceof EngineInputError) problems = cause.problems
    }

    expect(splitEngineProblems(problems, config)).toEqual({
      missingAnswers: [{ questionId: 'Q_Mirek_1_1', characterId: 'Mirek', chapter: 1 }],
      otherProblems: [],
    })
  })
})

describe('input hash', () => {
  const state = createInitialState(config)
  const inputs = { chapter: 1 as const, answers: chapter1Answers(), rolls: chapter1Rolls() }

  it('is the same for the same input, whatever order the keys come in', () => {
    const reordered = { rolls: inputs.rolls, answers: structuredClone(inputs.answers), chapter: inputs.chapter }

    expect(inputHash(state, reordered, config)).toBe(inputHash(state, inputs, config))
  })

  it('changes with one answer', () => {
    const changed = structuredClone(inputs)
    const first = changed.answers[0]
    if (first) first.selectedOptionIds = ['A_Marie_1_1_Antonin']

    expect(inputHash(state, changed, config)).not.toBe(inputHash(state, inputs, config))
  })

  it('changes with a roll', () => {
    const rolls: RollInput[] = chapter1Rolls().map((roll) => ({ ...roll, value: roll.value - 1 }))

    expect(inputHash(state, { ...inputs, rolls }, config)).not.toBe(inputHash(state, inputs, config))
  })
})

describe('rolls', () => {
  const evaluateChapter1 = (rolls: RollInput[]): EvaluateResult =>
    evaluate(createInitialState(config), { chapter: 1, answers: chapter1Answers(), rolls }, config)

  it('reads a stored roll with the owner of its variant\'s block', () => {
    const stored = [{ blockVariationId: fakeDbId('variation', 'V_Marie_1_Historie_1_C'), occurrence: 0, value: 80 }]

    expect(rollsFromRows(stored, directory)).toEqual(chapter1Rolls())
  })

  it('rolls what the engine lacks and ends with nothing missing', () => {
    const { result, newRolls, rolls } = resolveRolls(evaluateChapter1, [], () => 80)

    expect(result.missingRolls).toEqual([])
    expect(newRolls).toEqual(chapter1Rolls())
    expect(rolls).toEqual(chapter1Rolls())
    expect(result.state).toEqual(fixture.chapter1.state)
  })

  it('never rolls again what is already stored', () => {
    const { newRolls } = resolveRolls(evaluateChapter1, chapter1Rolls(), () => {
      throw new Error('a stored roll was rolled again')
    })

    expect(newRolls).toEqual([])
  })

  it('gives up after the round limit instead of looping', () => {
    let evaluations = 0
    const alwaysMissing = (rolls: RollInput[]): EvaluateResult => {
      evaluations += 1

      return {
        ...fixture.chapter1,
        missingRolls: [
          { ownerKind: 'character', ownerId: 'Marie', variationId: `V_${rolls.length}`, occurrence: 0, percent: 50 },
        ],
      }
    }

    expect(() => resolveRolls(alwaysMissing, [], () => 1, 3)).toThrow(RollLoopError)
    expect(evaluations).toBe(4)
  })
})
