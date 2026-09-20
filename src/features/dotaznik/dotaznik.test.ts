import { describe, expect, it } from 'vitest'
import type { AskedQuestionType, CompletionStatus, OptionView, QuestionView } from '@/computation'
import type { AnswerDraft } from './types/answer-draft'
import { characterNeighbours } from './utils/character-neighbours'
import { draftAnswerState } from './utils/draft-answer-state'
import { draftFromAnswer, EMPTY_DRAFT } from './utils/draft-from-answer'
import { parseWholeNumber } from './utils/parse-whole-number'
import { payoutProgress } from './utils/payout-progress'
import { storedValueOfAnswer, storedValueOfWrite } from './utils/stored-answer-value'
import { toAnswerWrite } from './utils/to-answer-write'

const option = (id: string, label: string, extra: Partial<OptionView> = {}): OptionView => ({
  id,
  label,
  isOther: false,
  inputs: [],
  ...extra,
})

const question = (type: AskedQuestionType, options: OptionView[]): QuestionView => ({
  id: 'Q_Marie_1_1',
  ordinal: 1,
  type,
  source: 'player',
  text: 'Komu pomůžeš?',
  helpText: null,
  options,
})

const draft = (changes: Partial<AnswerDraft>): AnswerDraft => ({ ...EMPTY_DRAFT, ...changes })

const MARIE = { id: 'Marie', firstName: 'Marie', lastName: 'Nováková' }
const MIREK = { id: 'Mirek', firstName: 'Mirek', lastName: 'Pokorný' }

const householdOption = (kind: 'household_create' | 'household_dissolve', jointBalance?: number): OptionView =>
  option('A_Org_1_1_Ano', 'Ano', {
    inputs: [
      { key: 'input1', person: MARIE },
      { key: 'input2', person: MIREK },
    ],
    householdEffect:
      jointBalance === undefined ? { kind, householdId: 'MarieMirek' } : { kind, householdId: 'MarieMirek', jointBalance },
  })

const choices = [option('A_Karel', 'Karel'), option('A_Petr', 'Petr'), option('A_Other', '_OTHER_', { isOther: true })]

describe('whole number field', () => {
  it('an empty field is not a zero', () => {
    expect(parseWholeNumber('', false)).toEqual({ _type: 'empty' })
    expect(parseWholeNumber('   ', true)).toEqual({ _type: 'empty' })
    expect(parseWholeNumber('0', false)).toEqual({ _type: 'valid', value: 0 })
  })

  it('takes whole numbers only', () => {
    expect(parseWholeNumber(' 12 ', false)).toEqual({ _type: 'valid', value: 12 })
    for (const text of ['1.5', '1,5', '1e3', 'dvě', '1 000', '+3', '--1']) {
      expect(parseWholeNumber(text, true), text).toEqual({ _type: 'invalid' })
    }
  })

  it('an `{input}` is never negative; a `*_direct` value may be', () => {
    expect(parseWholeNumber('-3', false)).toEqual({ _type: 'invalid' })
    expect(parseWholeNumber('-3', true)).toEqual({ _type: 'valid', value: -3 })
    expect(parseWholeNumber('-0', true)).toEqual({ _type: 'valid', value: 0 })
  })

  it('refuses what the database column could not hold', () => {
    expect(parseWholeNumber('2147483647', false)).toEqual({ _type: 'valid', value: 2147483647 })
    expect(parseWholeNumber('2147483648', false)).toEqual({ _type: 'invalid' })
  })
})

describe('form value → database write', () => {
  it('bool: the boolean is the answer, no option row is stored', () => {
    const yesNo = question('bool', [option('A_Ano', 'Ano'), option('A_Ne', 'Ne')])

    expect(toAnswerWrite(yesNo, draft({ boolValue: false }))).toEqual({
      _type: 'write',
      write: { boolValue: false, numericValue: null, textValue: null, selectedOptionIds: [], inputValues: [] },
      warnings: [],
    })
    expect(toAnswerWrite(yesNo, EMPTY_DRAFT)).toEqual({ _type: 'cancel' })
  })

  it('single and poll-answer: exactly one option', () => {
    for (const type of ['single', 'poll-answer'] as const) {
      const outcome = toAnswerWrite(question(type, choices), draft({ selectedOptionIds: ['A_Petr'] }))

      expect(outcome).toMatchObject({ _type: 'write', write: { boolValue: null, selectedOptionIds: ['A_Petr'] } })
      expect(toAnswerWrite(question(type, choices), draft({ selectedOptionIds: ['A_Petr', 'A_Karel'] }))._type).toBe('invalid')
    }
  })

  it('multi: the ticked options in sheet order; an option the question does not have is dropped', () => {
    const outcome = toAnswerWrite(question('multi', choices), draft({ selectedOptionIds: ['A_Petr', 'A_Karel', 'A_Cizi'] }))

    expect(outcome).toMatchObject({ _type: 'write', write: { selectedOptionIds: ['A_Karel', 'A_Petr'] } })
  })

  it('multi with nothing ticked is not an answer — the same as cancelling it', () => {
    expect(toAnswerWrite(question('multi', choices), draft({ selectedOptionIds: [] }))).toEqual({ _type: 'cancel' })
    expect(toAnswerWrite(question('multi', choices), draft({ selectedOptionIds: [], otherText: 'zbylo tu' }))).toEqual({
      _type: 'cancel',
    })
  })

  it('`_OTHER_`: the text goes to `text_value`; without text it is a warning, not a refusal', () => {
    expect(
      toAnswerWrite(question('multi', choices), draft({ selectedOptionIds: ['A_Other'], otherText: ' sousedka ' })),
    ).toMatchObject({ _type: 'write', write: { textValue: 'sousedka', selectedOptionIds: ['A_Other'] }, warnings: [] })
    expect(toAnswerWrite(question('single', choices), draft({ selectedOptionIds: ['A_Other'] }))).toMatchObject({
      _type: 'write',
      write: { textValue: null },
      warnings: ['other_text_empty'],
    })
  })

  it('the text of an `_OTHER_` that is no longer chosen is not stored', () => {
    expect(
      toAnswerWrite(question('single', choices), draft({ selectedOptionIds: ['A_Karel'], otherText: 'sousedka' })),
    ).toMatchObject({ _type: 'write', write: { textValue: null } })
  })

  it('scale_direct and resource_direct: the number is the answer', () => {
    for (const type of ['scale_direct', 'resource_direct'] as const) {
      const direct = question(type, [option('A_Nastaveni', 'Nastavení')])

      expect(toAnswerWrite(direct, draft({ numberText: '7' }))).toMatchObject({
        _type: 'write',
        write: { numericValue: 7, selectedOptionIds: [] },
      })
      expect(toAnswerWrite(direct, draft({ numberText: '-2' }))).toMatchObject({ write: { numericValue: -2 } })
      expect(toAnswerWrite(direct, draft({ numberText: '' }))).toEqual({ _type: 'cancel' })
      expect(toAnswerWrite(direct, draft({ numberText: 'sedm' }))).toEqual({ _type: 'invalid', fields: [{}] })
    }
  })

  it('`{input}` values: stored for the chosen option only, an empty one is left out rather than zeroed', () => {
    const marriage = question('bool', [householdOption('household_create'), option('A_Org_1_1_Ne', 'Ne')])
    const inputTexts = { A_Org_1_1_Ano: { input1: '4', input2: '' } }

    expect(toAnswerWrite(marriage, draft({ boolValue: true, inputTexts }))).toMatchObject({
      _type: 'write',
      write: { boolValue: true, inputValues: [{ optionId: 'A_Org_1_1_Ano', inputKey: 'input1', value: 4 }] },
    })
    expect(toAnswerWrite(marriage, draft({ boolValue: false, inputTexts }))).toMatchObject({
      write: { boolValue: false, inputValues: [] },
    })
  })

  it('a bad `{input}` names its field and stores nothing', () => {
    const marriage = question('bool', [householdOption('household_create'), option('A_Org_1_1_Ne', 'Ne')])

    expect(
      toAnswerWrite(marriage, draft({ boolValue: true, inputTexts: { A_Org_1_1_Ano: { input1: '-4', input2: '6' } } })),
    ).toEqual({ _type: 'invalid', fields: [{ optionId: 'A_Org_1_1_Ano', inputKey: 'input1' }] })
  })
})

describe('state of a draft', () => {
  const marriage = question('bool', [householdOption('household_create'), option('A_Org_1_1_Ne', 'Ne')])

  it('follows the panel\'s measure: an empty `{input}` is incomplete', () => {
    expect(draftAnswerState(marriage, EMPTY_DRAFT)).toBe('unanswered')
    expect(draftAnswerState(marriage, draft({ boolValue: true }))).toBe('incomplete')
    expect(
      draftAnswerState(marriage, draft({ boolValue: true, inputTexts: { A_Org_1_1_Ano: { input1: '4', input2: '0' } } })),
    ).toBe('complete')
    expect(draftAnswerState(marriage, draft({ boolValue: false }))).toBe('complete')
  })
})

describe('draft from a stored answer', () => {
  it('an unanswered question starts with nothing selected and nothing typed', () => {
    expect(draftFromAnswer(undefined)).toEqual({
      boolValue: null,
      selectedOptionIds: [],
      numberText: '',
      otherText: '',
      inputTexts: {},
    })
  })

  it('round-trips through the write without reporting a change', () => {
    const marriage = question('bool', [householdOption('household_create'), option('A_Org_1_1_Ne', 'Ne')])
    const answer = {
      boolValue: true,
      numericValue: null,
      textValue: null,
      selectedOptionIds: [],
      inputValues: { A_Org_1_1_Ano: { input2: 6, input1: 4 } },
      answeredBy: 'Natálie',
      answeredAt: '2026-09-12T10:00:00.000Z',
    }
    const outcome = toAnswerWrite(marriage, draftFromAnswer(answer))

    expect(outcome._type).toBe('write')
    if (outcome._type !== 'write') return
    expect(storedValueOfWrite(outcome.write)).toEqual(storedValueOfAnswer(answer))
  })
})

describe('running total of a dissolution', () => {
  it('adds what is typed against the joint balance', () => {
    const divorce = householdOption('household_dissolve', 10)

    expect(payoutProgress(divorce, { input1: '7' })).toEqual({ distributed: 7, balance: 10, matches: false })
    expect(payoutProgress(divorce, { input1: '7', input2: '3' })).toEqual({ distributed: 10, balance: 10, matches: true })
    expect(payoutProgress(divorce, { input1: '7', input2: '4' })).toEqual({ distributed: 11, balance: 10, matches: false })
  })

  it('never fills in the rest: an empty field keeps the split from matching', () => {
    expect(payoutProgress(householdOption('household_dissolve', 10), { input1: '10' })).toMatchObject({ matches: false })
    expect(payoutProgress(householdOption('household_dissolve', 10), { input1: '10', input2: '0' })).toMatchObject({
      matches: true,
    })
    expect(payoutProgress(householdOption('household_dissolve', 0), undefined)).toMatchObject({ matches: false })
  })

  it('has nothing to say about a marriage or a household that does not exist', () => {
    expect(payoutProgress(householdOption('household_create'), { input1: '4' })).toBeUndefined()
    expect(payoutProgress(householdOption('household_dissolve'), { input1: '4' })).toBeUndefined()
  })
})

describe('moving between characters', () => {
  const order = ['Antonin', 'Marie', 'Mirek', 'Vera']
  const statuses: Record<string, CompletionStatus> = { Antonin: 'in_progress', Marie: 'done', Mirek: 'done', Vera: 'done' }
  const statusOf = (characterId: string): CompletionStatus | undefined => statuses[characterId]

  it('follows the panel\'s order and stops at its ends', () => {
    expect(characterNeighbours(order, 'Marie', statusOf)).toMatchObject({ previous: 'Antonin', next: 'Mirek' })
    expect(characterNeighbours(order, 'Antonin', statusOf).previous).toBeUndefined()
    expect(characterNeighbours(order, 'Vera', statusOf).next).toBeUndefined()
  })

  it('„Další nevyplněná" wraps around and never points at the character itself', () => {
    expect(characterNeighbours(order, 'Mirek', statusOf).nextUnfilled).toBe('Antonin')
    expect(characterNeighbours(order, 'Antonin', statusOf).nextUnfilled).toBeUndefined()
  })
})
