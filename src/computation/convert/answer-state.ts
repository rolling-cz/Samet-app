import type { AnswerRows } from '../types/answer-rows'
import type { AnswerState } from '../types/completion'
import type { ConfigRows } from '../types/config-rows'
import { answeredOptions } from './answered-options'

type QuestionRow = Pick<ConfigRows['questions'][number], 'type'>
type OptionRow = ConfigRows['answerOptions'][number]
type AnswerRow = Pick<AnswerRows['answers'][number], 'boolValue' | 'numericValue'>

const DIRECT_TYPES: readonly string[] = Object.freeze(['scale_direct', 'resource_direct'])

/**
 * Whether the stored answer would get through a computation. An empty `{input}`
 * is not a zero and a `multi` with nothing ticked is not an answer (§4.4, §6.1).
 */
export const answerState = (
  question: QuestionRow,
  answer: AnswerRow | undefined,
  ownOptions: readonly OptionRow[],
  chosen: readonly OptionRow[],
  inputKeys: ReadonlyMap<string, readonly string[]>,
  /** `<option key>` → placeholder names that have a value. */
  enteredInputs: ReadonlyMap<string, ReadonlySet<string>>,
): AnswerState => {
  if (!answer) return 'unanswered'

  const isDirect = DIRECT_TYPES.includes(question.type)
  if (isDirect && answer.numericValue === null) return 'incomplete'

  const options = answeredOptions(question, answer.boolValue, ownOptions, chosen)
  if (!isDirect && options.length === 0) return 'incomplete'

  for (const option of options) {
    for (const key of inputKeys.get(option.id) ?? []) {
      if (!enteredInputs.get(option.id)?.has(key)) return 'incomplete'
    }
  }

  return 'complete'
}
