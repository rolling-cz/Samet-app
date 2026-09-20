import type { AnswerState, QuestionView } from '@/computation'
import type { AnswerDraft } from '../types/answer-draft'
import { chosenOptions } from './chosen-options'
import { toAnswerWrite } from './to-answer-write'

/** The draft's state by the same measure the panel uses: would it get through a computation? */
export const draftAnswerState = (question: QuestionView, draft: AnswerDraft): AnswerState => {
  const outcome = toAnswerWrite(question, draft)
  if (outcome._type === 'cancel') return 'unanswered'
  if (outcome._type === 'invalid') return 'incomplete'

  const entered = outcome.write.inputValues
  for (const option of chosenOptions(question, draft)) {
    for (const field of option.inputs) {
      if (!entered.some((input) => input.optionId === option.id && input.inputKey === field.key)) return 'incomplete'
    }
  }

  return 'complete'
}
