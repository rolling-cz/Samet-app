import type { AnswerView } from '@/computation'
import type { AnswerDraft } from '../types/answer-draft'

/** Nothing preselected, nothing prefilled — an unanswered question is an empty draft (§6.3). */
export const EMPTY_DRAFT: AnswerDraft = Object.freeze({
  boolValue: null,
  selectedOptionIds: [],
  numberText: '',
  otherText: '',
  inputTexts: {},
})

export const draftFromAnswer = (answer: AnswerView | undefined): AnswerDraft => {
  if (!answer) return EMPTY_DRAFT

  const inputTexts: AnswerDraft['inputTexts'] = {}
  for (const [optionId, values] of Object.entries(answer.inputValues)) {
    const texts: Record<string, string> = {}
    for (const [key, value] of Object.entries(values)) texts[key] = String(value)
    inputTexts[optionId] = texts
  }

  return {
    boolValue: answer.boolValue,
    selectedOptionIds: [...answer.selectedOptionIds],
    numberText: answer.numericValue === null ? '' : String(answer.numericValue),
    otherText: answer.textValue ?? '',
    inputTexts,
  }
}
