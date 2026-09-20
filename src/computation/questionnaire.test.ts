import { describe, expect, it } from 'vitest'
import { createInitialState, type AnswerInput } from '@/engine'
import { chapter1Answers, chapter2Answers, choose, loadFixtureConfig, runFixture, withInputs } from '@/testing/fixture-run'
import { askedQuestions } from './convert/asked-questions'
import { buildIdDirectory } from './convert/build-id-directory'
import { chapterCompletion } from './convert/chapter-completion'
import { chapterStaleness } from './convert/chapter-staleness'
import { completionSummary } from './convert/completion-summary'
import { inputKeysByOption } from './convert/input-keys-by-option'
import { questionnaireView } from './convert/questionnaire-view'
import { answersToRows } from './testing/answers-to-rows'
import { fakeConfigRows, fakeDbId } from './testing/fake-config-rows'
import { fakeQuestionnaireRows } from './testing/fake-questionnaire-rows'
import type { AskedQuestion } from './types/asked-question'
import type { CharacterCompletion } from './types/completion'
import type { EnteredAnswerRows } from './types/questionnaire-rows'

const MARRIED = 'MarieMirek'
const ANSWERED_AT = new Date('2026-09-12T10:00:00Z')

const config = loadFixtureConfig()
const fixture = runFixture({ config })
const rows = fakeConfigRows(config, [MARRIED])
const details = fakeQuestionnaireRows(config)
const directory = buildIdDirectory(rows)
const inputKeys = inputKeysByOption(details)
const characterIds = config.characters.map((character) => character.id)

const askedIn = (chapter: number): AskedQuestion[] => {
  const selected = new Set<string>()
  if (chapter === 2) {
    for (const ids of Object.values(fixture.chapter1.state.selectedVariants.characters)) {
      for (const id of ids) selected.add(fakeDbId('variation', id))
    }
  }

  return askedQuestions(rows.questions, fakeDbId('chapter', chapter), selected).flatMap((question) =>
    question.characterId === null
      ? []
      : [{ ...question, characterExternalId: directory.characters.toExternal(question.characterId) }],
  )
}

const entered = (answers: readonly AnswerInput[]): EnteredAnswerRows => {
  const converted = answersToRows(answers, rows, directory)

  return {
    ...converted,
    answers: converted.answers.map((answer) => ({ ...answer, answeredBy: 'Natálie', answeredAt: ANSWERED_AT })),
  }
}

const completionOf = (chapter: number, answers: readonly AnswerInput[]): Map<string, CharacterCompletion> =>
  new Map(
    chapterCompletion(characterIds, askedIn(chapter), rows, inputKeys, entered(answers)).map((character) => [
      character.characterId,
      character,
    ]),
  )

const without = (answers: readonly AnswerInput[], questionId: string): AnswerInput[] =>
  answers.filter((answer) => answer.questionId !== questionId)

describe('completion of a character', () => {
  it('is empty with no answer, in progress with some, done with all', () => {
    expect(completionOf(1, []).get('Marie')?.status).toBe('empty')
    expect(completionOf(1, [choose('Q_Marie_1_1', 'A_Marie_1_1_Mirek')]).get('Marie')).toMatchObject({
      status: 'in_progress',
      askedCount: 3,
      completeCount: 1,
    })
    expect(completionOf(1, chapter1Answers()).get('Marie')?.status).toBe('done')
  })

  it('a chosen option with an empty `{input}` keeps the character in progress', () => {
    const marriage = choose('Q_Organizatori_1_1', 'A_Organizatori_1_1_Ano')
    const halfFilled: AnswerInput = { ...marriage, inputs: { A_Organizatori_1_1_Ano: { input1: 4 } } }

    for (const answer of [marriage, halfFilled]) {
      const answers = [...without(chapter1Answers(), 'Q_Organizatori_1_1'), answer]

      expect(completionOf(1, answers).get('Organizatori')?.status).toBe('in_progress')
    }
    expect(completionOf(1, chapter1Answers()).get('Organizatori')?.status).toBe('done')
  })

  it('the option that was not chosen asks for no `{input}`', () => {
    const answers = [...without(chapter1Answers(), 'Q_Organizatori_1_1'), choose('Q_Organizatori_1_1', 'A_Organizatori_1_1_Ne')]

    expect(completionOf(1, answers).get('Organizatori')?.status).toBe('done')
  })

  it('a `*_direct` answer without its number keeps the character in progress', () => {
    const answers = [
      ...without(chapter1Answers(), 'Q_Organizatori_1_2'),
      choose('Q_Organizatori_1_2', 'A_Organizatori_1_2_Nastaveni'),
    ]

    expect(completionOf(1, answers).get('Organizatori')?.status).toBe('in_progress')
  })

  it('a character with no question in the chapter is done, and says it has none', () => {
    expect(completionOf(3, []).get('Mirek')).toEqual({
      characterId: 'Mirek',
      status: 'done',
      askedCount: 0,
      completeCount: 0,
    })
  })

  it('cancelling an answer takes the character back: to in progress, or to empty when it was the only one', () => {
    expect(completionOf(1, without(chapter1Answers(), 'Q_Marie_1_2')).get('Marie')?.status).toBe('in_progress')
    expect(completionOf(1, without(chapter1Answers(), 'Q_Mirek_1_1')).get('Mirek')?.status).toBe('empty')
  })

  it('a `multi` row left with nothing ticked is no answer either', () => {
    const answers = [...without(chapter1Answers(), 'Q_Marie_1_2'), choose('Q_Marie_1_2')]

    expect(completionOf(1, answers).get('Marie')).toMatchObject({ status: 'in_progress', completeCount: 2 })
  })
})

describe('summary „Vyplněno X / Y"', () => {
  it('counts characters, over the asked questions only', () => {
    // `Q_Marie_2_2` waits for a variant that was not selected, so Marie is done without it.
    expect(askedIn(2).map((question) => question.externalId)).not.toContain('Q_Marie_2_2')

    const completion = [...completionOf(2, chapter2Answers()).values()]

    expect(completionSummary(completion)).toEqual({ done: characterIds.length, total: characterIds.length })
  })

  it('an answer to a question that is not asked counts for nothing', () => {
    const completion = completionOf(2, [choose('Q_Marie_2_2', 'A_Marie_2_2_Ano')])

    expect(completion.get('Marie')?.status).toBe('empty')
  })

  it('leaves out the characters still being filled in', () => {
    const completion = [...completionOf(1, without(chapter1Answers(), 'Q_Mirek_1_1')).values()]

    expect(completionSummary(completion)).toEqual({ done: characterIds.length - 1, total: characterIds.length })
  })
})

describe('questionnaire view', () => {
  const view = (characterId: string, chapter: number, answers: readonly AnswerInput[] = []) =>
    questionnaireView(
      characterId,
      askedIn(chapter),
      rows,
      details,
      entered(answers),
      chapter === 1 ? createInitialState(config) : fixture.chapter1.state,
      directory,
    )

  it('lists the asked questions in sheet order and nothing else', () => {
    expect(view('Marie', 1).questions.map((question) => question.id)).toEqual(['Q_Marie_1_1', 'Q_Marie_1_2', 'Q_Marie_1_3'])
    expect(view('Marie', 2).questions.map((question) => question.id)).toEqual(['Q_Marie_2_1', 'Q_Marie_2_3'])
  })

  it('a vote shows its poll\'s text and options', () => {
    const vote = view('Antonin', 1).questions.find((question) => question.id === 'Q_Antonin_1_3')
    const poll = config.questions.find((question) => question.id === 'Q_Group_Funkcionari_Nastupce')

    expect(vote).toMatchObject({ type: 'poll-answer', pollId: 'Q_Group_Funkcionari_Nastupce', text: poll?.text })
    expect(vote?.options.map((option) => option.id)).toEqual(poll?.options.map((option) => option.id))
  })

  it('a marriage raises one field per member, named after them', () => {
    const marriage = view('Organizatori', 1).questions.find((question) => question.id === 'Q_Organizatori_1_1')
    const yes = marriage?.options.find((option) => option.id === 'A_Organizatori_1_1_Ano')

    expect(yes?.inputs).toEqual([
      { key: 'input1', person: expect.objectContaining({ id: 'Marie' }) },
      { key: 'input2', person: expect.objectContaining({ id: 'Mirek' }) },
    ])
    expect(yes?.householdEffect).toEqual({ kind: 'household_create', householdId: MARRIED })
    expect(marriage?.options.find((option) => option.id === 'A_Organizatori_1_1_Ne')?.inputs).toEqual([])
  })

  it('`{input1}` follows the effect\'s first argument even when the household ID sorts the other way', () => {
    const reversed = structuredClone(details)
    for (const effect of reversed.effects) {
      if (effect.kind !== 'household_create') continue
      ;[effect.characterId, effect.relatedCharacterId] = [effect.relatedCharacterId, effect.characterId]
    }

    const marriage = questionnaireView(
      'Organizatori',
      askedIn(1),
      rows,
      reversed,
      entered([]),
      createInitialState(config),
      directory,
    ).questions.find((question) => question.id === 'Q_Organizatori_1_1')
    const yes = marriage?.options.find((option) => option.id === 'A_Organizatori_1_1_Ano')

    expect(yes?.inputs.map((field) => [field.key, field.person?.id])).toEqual([
      ['input1', 'Mirek'],
      ['input2', 'Marie'],
    ])
    expect(yes?.householdEffect?.householdId).toBe(MARRIED)
  })

  it('a divorce shows the joint balance its inputs must add up to', () => {
    const divorce = view('Organizatori', 2).questions.find((question) => question.id === 'Q_Organizatori_2_1')

    expect(divorce?.options.find((option) => option.id === 'A_Organizatori_2_1_Ano')?.householdEffect).toEqual({
      kind: 'household_dissolve',
      householdId: MARRIED,
      jointBalance: fixture.chapter1.state.households[MARRIED]?.resources.Wealth,
    })
  })

  it('`scale_direct` names the scale it sets, with that pair\'s bounds and current value', () => {
    const direct = view('Organizatori', 1).questions.find((question) => question.id === 'Q_Organizatori_1_2')
    const impact = config.questions
      .find((question) => question.id === 'Q_Organizatori_1_2')
      ?.options[0]?.impacts.find((candidate) => candidate.kind === 'scale')
    const scale = config.scales.find((candidate) => candidate.externalId === impact?.externalId)

    expect(scale, 'the fixture sets a scale the config knows').toBeDefined()
    expect(direct?.target).toMatchObject({
      _type: 'scale',
      externalId: scale?.externalId,
      min: scale?.min,
      max: scale?.max,
      value: scale?.defaultValue,
      owner: expect.objectContaining({ id: scale?.characterId }),
    })
  })

  it('`resource_direct` says which account it sets', () => {
    const direct = view('Organizatori', 1).questions.find((question) => question.id === 'Q_Organizatori_1_3')

    expect(direct?.target).toMatchObject({ _type: 'resource', account: { _type: 'personal' } })
  })

  it('carries the stored answer with who entered it', () => {
    const answered = view('Organizatori', 1, [
      withInputs(choose('Q_Organizatori_1_1', 'A_Organizatori_1_1_Ano'), 'A_Organizatori_1_1_Ano', 4, 6),
    ]).questions.find((question) => question.id === 'Q_Organizatori_1_1')

    expect(answered?.answer).toEqual({
      boolValue: true,
      numericValue: null,
      textValue: null,
      selectedOptionIds: [],
      inputValues: { A_Organizatori_1_1_Ano: { input1: 4, input2: 6 } },
      answeredBy: 'Natálie',
      answeredAt: ANSWERED_AT.toISOString(),
    })
    expect(view('Marie', 1).questions.every((question) => question.answer === undefined)).toBe(true)
  })

  it('shows the state before the chapter and who the joint account is shared with', () => {
    const marie = view('Marie', 2)

    expect(marie.state.household?.householdId).toBe(MARRIED)
    expect(marie.partners.map((partner) => partner.id)).toEqual(['Mirek'])
    expect(view('Marie', 1).partners).toEqual([])
  })
})

describe('staleness of a computation', () => {
  const computedAt = new Date('2026-09-12T12:00:00Z')

  it('is none without a computation, fresh when nothing changed after it', () => {
    expect(chapterStaleness([], [computedAt])).toEqual({ _type: 'not_computed' })
    expect(chapterStaleness([computedAt], [new Date('2026-09-12T11:00:00Z')])).toEqual({ _type: 'fresh' })
    expect(chapterStaleness([computedAt], [])).toEqual({ _type: 'fresh' })
  })

  it('is stale when an answer changed after the newest computation', () => {
    const changedAt = new Date('2026-09-12T13:00:00Z')

    expect(chapterStaleness([new Date('2026-09-12T09:00:00Z'), computedAt], [changedAt])).toEqual({
      _type: 'stale',
      computedAt: computedAt.toISOString(),
      answersChangedAt: changedAt.toISOString(),
    })
  })
})
