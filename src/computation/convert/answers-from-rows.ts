import { compareIds, type AnswerInput } from '@/engine'
import { groupBy } from '@/utils/group-by'
import type { AnswerRows } from '../types/answer-rows'
import type { ConfigRows } from '../types/config-rows'
import type { IdDirectory } from '../types/id-directory'
import { UnknownIdError } from '../errors/unknownIdError'
import { answeredOptions } from './answered-options'

/**
 * Stored answers → the engine's `AnswerInput[]`, for every chapter up to
 * `upToChapter`: a condition reads earlier answers, and the engine tells a
 * forgotten one from a question never asked (§4.5).
 */
export const answersFromRows = (
  rows: AnswerRows,
  config: ConfigRows,
  directory: IdDirectory,
  upToChapter: number,
): AnswerInput[] => {
  const questions = new Map(config.questions.map((question) => [question.id, question]))
  const options = new Map(config.answerOptions.map((option) => [option.id, option]))
  const optionsByQuestion = groupBy(config.answerOptions, (option) => option.questionId)
  const selectedByAnswer = groupBy(rows.selectedOptions, (row) => row.answerId)
  const inputsByAnswer = groupBy(rows.inputValues, (row) => row.answerId)

  const inputs: AnswerInput[] = []

  for (const answer of rows.answers) {
    if (directory.chapters.toExternal(answer.chapterId) > upToChapter) continue

    const question = questions.get(answer.questionId)
    if (!question) throw new UnknownIdError('question', answer.questionId, 'to_config')

    const chosen = (selectedByAnswer.get(answer.id) ?? []).map((row) => {
      const option = options.get(row.answerOptionId)
      if (!option) throw new UnknownIdError('answer option', row.answerOptionId, 'to_config')

      return option
    })
    const selected = answeredOptions(question, answer.boolValue, optionsByQuestion.get(question.id) ?? [], chosen)

    const input: AnswerInput = {
      questionId: directory.questions.toExternal(question.id),
      selectedOptionIds: selected.map((option) => directory.answerOptions.toExternal(option.id)),
    }
    if (answer.numericValue !== null) input.value = answer.numericValue
    if (answer.textValue !== null) input.freeText = answer.textValue

    for (const row of inputsByAnswer.get(answer.id) ?? []) {
      const optionId = directory.answerOptions.toExternal(row.answerOptionId)
      input.inputs ??= {}
      input.inputs[optionId] = { ...input.inputs[optionId], [row.inputKey]: row.value }
    }

    inputs.push(input)
  }

  return inputs.sort((a, b) => compareIds(a.questionId, b.questionId))
}
