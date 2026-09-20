import type { AnswerView } from '@/computation'
import { compareIds } from '@/engine'
import type { AnswerWrite } from '../types/answer-write'
import type { StoredAnswerValue } from '../types/stored-answer-value'

/** One order for both sides of an audit entry, so „nothing changed" is a plain comparison. */
const sorted = (value: StoredAnswerValue): StoredAnswerValue => {
  const inputValues: StoredAnswerValue['inputValues'] = {}
  for (const optionId of Object.keys(value.inputValues).sort(compareIds)) {
    const values: Record<string, number> = {}
    for (const [key, number] of Object.entries(value.inputValues[optionId] ?? {}).sort(([a], [b]) => compareIds(a, b))) {
      values[key] = number
    }
    inputValues[optionId] = values
  }

  return {
    boolValue: value.boolValue,
    numericValue: value.numericValue,
    textValue: value.textValue,
    selectedOptionIds: [...value.selectedOptionIds].sort(compareIds),
    inputValues,
  }
}

export const storedValueOfAnswer = (answer: AnswerView): StoredAnswerValue => sorted(answer)

export const storedValueOfWrite = (write: AnswerWrite): StoredAnswerValue => {
  const inputValues: StoredAnswerValue['inputValues'] = {}
  for (const input of write.inputValues) {
    inputValues[input.optionId] = { ...inputValues[input.optionId], [input.inputKey]: input.value }
  }

  return sorted({
    boolValue: write.boolValue,
    numericValue: write.numericValue,
    textValue: write.textValue,
    selectedOptionIds: write.selectedOptionIds,
    inputValues,
  })
}
