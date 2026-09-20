import type { QuestionView } from '@/computation'
import { DIRECT_TYPES, SINGLE_CHOICE_TYPES } from '../constants/question-kinds'
import type { AnswerDraft } from '../types/answer-draft'
import type { AnswerWrite, DraftOutcome, DraftWarning, InvalidField } from '../types/answer-write'
import { chosenOptions } from './chosen-options'
import { parseWholeNumber } from './parse-whole-number'

const CANCEL: DraftOutcome = Object.freeze({ _type: 'cancel' })

/**
 * Form value → database write, for every question type. Pure, and run on both
 * sides: the form uses it to know what it is about to do, the server to do it.
 */
export const toAnswerWrite = (question: QuestionView, draft: AnswerDraft): DraftOutcome => {
  const isDirect = DIRECT_TYPES.includes(question.type)
  const invalid: InvalidField[] = []
  const warnings: DraftWarning[] = []

  const write: AnswerWrite = {
    boolValue: null,
    numericValue: null,
    textValue: null,
    selectedOptionIds: [],
    inputValues: [],
  }

  if (isDirect) {
    const number = parseWholeNumber(draft.numberText, true)
    if (number._type === 'empty') return CANCEL
    if (number._type === 'invalid') invalid.push({})
    else write.numericValue = number.value
  } else if (question.type === 'bool') {
    if (draft.boolValue === null) return CANCEL
    write.boolValue = draft.boolValue
  }

  const chosen = chosenOptions(question, draft)
  if (!isDirect && question.type !== 'bool') {
    if (chosen.length === 0) return CANCEL
    // A second option on a single choice is a broken form, not an answer to store.
    if (SINGLE_CHOICE_TYPES.includes(question.type) && chosen.length > 1) return { _type: 'invalid', fields: [{}] }
    write.selectedOptionIds = chosen.map((option) => option.id)
  }

  for (const option of chosen) {
    if (option.isOther) {
      const text = draft.otherText.trim()
      if (text === '') warnings.push('other_text_empty')
      else write.textValue = text
    }
    for (const field of option.inputs) {
      const number = parseWholeNumber(draft.inputTexts[option.id]?.[field.key] ?? '', false)
      if (number._type === 'invalid') invalid.push({ optionId: option.id, inputKey: field.key })
      if (number._type === 'valid') write.inputValues.push({ optionId: option.id, inputKey: field.key, value: number.value })
    }
  }

  return invalid.length > 0 ? { _type: 'invalid', fields: invalid } : { _type: 'write', write, warnings }
}
