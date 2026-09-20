/**
 * `AnswerInput[]` → answer rows: what the questionnaire will store, written
 * here for the fixture's made-up answers. Used by the tests and by
 * `scripts/compute-demo.ts`; the application itself only converts the other way.
 */
import type { AnswerInput } from '@/engine'
import { boolOptionLabel } from '../constants/bool-options'
import { UnknownIdError } from '../errors/unknownIdError'
import type { AnswerRows } from '../types/answer-rows'
import type { ConfigRows } from '../types/config-rows'
import type { IdDirectory } from '../types/id-directory'

export interface EnteredAnswerRows extends AnswerRows {
  answers: (AnswerRows['answers'][number] & { characterId: string })[]
}

const DIRECT_TYPES: readonly string[] = Object.freeze(['scale_direct', 'resource_direct'])

export const answersToRows = (
  inputs: readonly AnswerInput[],
  config: ConfigRows,
  directory: IdDirectory,
): EnteredAnswerRows => {
  const questions = new Map(config.questions.map((question) => [question.id, question]))
  const options = new Map(config.answerOptions.map((option) => [option.id, option]))
  const rows: EnteredAnswerRows = { answers: [], selectedOptions: [], inputValues: [] }

  for (const input of inputs) {
    const question = questions.get(directory.questions.toDb(input.questionId))
    if (!question || question.characterId === null) throw new UnknownIdError('question', input.questionId, 'to_database')

    const answerId = `answer:${input.questionId}`
    const selected = input.selectedOptionIds.map((optionId) => {
      const option = options.get(directory.answerOptions.toDb(optionId))
      if (!option) throw new UnknownIdError('answer option', optionId, 'to_database')

      return option
    })
    const isBool = question.type === 'bool'

    rows.answers.push({
      id: answerId,
      chapterId: question.chapterId,
      characterId: question.characterId,
      questionId: question.id,
      boolValue: isBool ? selected[0]?.label === boolOptionLabel(true) : null,
      numericValue: input.value ?? null,
      textValue: input.freeText ?? null,
    })
    if (!isBool && !DIRECT_TYPES.includes(question.type)) {
      for (const option of selected) rows.selectedOptions.push({ answerId, answerOptionId: option.id })
    }
    for (const [optionId, values] of Object.entries(input.inputs ?? {})) {
      for (const [inputKey, value] of Object.entries(values)) {
        rows.inputValues.push({ answerId, answerOptionId: directory.answerOptions.toDb(optionId), inputKey, value })
      }
    }
  }

  return rows
}
