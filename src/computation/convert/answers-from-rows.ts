import { compareIds, type AnswerInput } from '@/engine'
import { boolOptionLabel } from '../constants/bool-options'
import type { AnswerRows } from '../types/answer-rows'
import type { ConfigRows } from '../types/config-rows'
import type { IdDirectory } from '../types/id-directory'
import { UnknownIdError } from '../errors/unknownIdError'

type QuestionRow = ConfigRows['questions'][number]
type OptionRow = ConfigRows['answerOptions'][number]

const byOrdinal = (a: OptionRow, b: OptionRow): number => a.ordinal - b.ordinal

const groupBy = <T>(rows: readonly T[], keyOf: (row: T) => string): Map<string, T[]> => {
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    const group = groups.get(keyOf(row)) ?? []
    group.push(row)
    groups.set(keyOf(row), group)
  }

  return groups
}

/**
 * Which options the answer stands for. Nothing is repaired: an answer with no
 * value yields no option, and the engine says what is wrong with it (§6.3).
 */
const selectedOptions = (
  question: QuestionRow,
  answer: AnswerRows['answers'][number],
  ownOptions: readonly OptionRow[],
  chosen: readonly OptionRow[],
): OptionRow[] => {
  switch (question.type) {
    case 'bool': {
      if (answer.boolValue === null) return []
      const label = boolOptionLabel(answer.boolValue)

      return ownOptions.filter((option) => option.label === label)
    }
    // The number is the answer; the question's one option only carries `=VALUE` (§6.7).
    case 'scale_direct':
    case 'resource_direct':
      return [...ownOptions]
    default:
      return [...chosen].sort(byOrdinal)
  }
}

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
    const selected = selectedOptions(question, answer, optionsByQuestion.get(question.id) ?? [], chosen)

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
