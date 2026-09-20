import type { OptionView, QuestionView } from '@/computation'
import { boolOptionLabel } from '@/computation/constants/bool-options'
import { DIRECT_TYPES } from '../constants/question-kinds'
import type { AnswerDraft } from '../types/answer-draft'

/**
 * The options a draft stands for — whose `{input}` fields show and whose
 * values are stored. Mirrors the core's `answeredOptions`, over the view.
 */
export const chosenOptions = (question: QuestionView, draft: AnswerDraft): OptionView[] => {
  if (question.type === 'bool') {
    if (draft.boolValue === null) return []
    const label = boolOptionLabel(draft.boolValue)

    return question.options.filter((option) => option.label === label)
  }
  if (DIRECT_TYPES.includes(question.type)) return draft.numberText.trim() === '' ? [] : question.options

  return question.options.filter((option) => draft.selectedOptionIds.includes(option.id))
}
