import { groupBy } from '@/utils/group-by'
import type { AnswerRows } from '../types/answer-rows'
import type { AskedQuestion } from '../types/asked-question'
import type { CharacterCompletion, CompletionStatus } from '../types/completion'
import type { ConfigRows } from '../types/config-rows'
import { answerState } from './answer-state'

type ChapterAnswerRows = {
  answers: Pick<AnswerRows['answers'][number], 'id' | 'questionId' | 'boolValue' | 'numericValue'>[]
  selectedOptions: AnswerRows['selectedOptions']
  inputValues: Pick<AnswerRows['inputValues'][number], 'answerId' | 'answerOptionId' | 'inputKey'>[]
}

const statusOf = (askedCount: number, completeCount: number, startedCount: number): CompletionStatus => {
  if (completeCount === askedCount) return 'done'

  return startedCount === 0 ? 'empty' : 'in_progress'
}

/**
 * Completion of every character in one chapter, over the questions asked there
 * — an answer to a question that is not asked counts for nothing. A character
 * with no question is done.
 */
export const chapterCompletion = (
  characterIds: readonly string[],
  asked: readonly AskedQuestion[],
  config: Pick<ConfigRows, 'answerOptions'>,
  inputKeys: ReadonlyMap<string, readonly string[]>,
  rows: ChapterAnswerRows,
): CharacterCompletion[] => {
  const options = new Map(config.answerOptions.map((option) => [option.id, option]))
  const optionsByQuestion = groupBy(config.answerOptions, (option) => option.questionId)
  const answersByQuestion = new Map(rows.answers.map((answer) => [answer.questionId, answer]))
  const selectedByAnswer = groupBy(rows.selectedOptions, (row) => row.answerId)
  const inputsByAnswer = groupBy(rows.inputValues, (row) => row.answerId)
  const askedByCharacter = groupBy(asked, (question) => question.characterExternalId)

  return characterIds.map((characterId) => {
    const questions = askedByCharacter.get(characterId) ?? []
    let completeCount = 0
    let startedCount = 0

    for (const question of questions) {
      const answer = answersByQuestion.get(question.id)
      const chosen = (answer ? (selectedByAnswer.get(answer.id) ?? []) : []).flatMap(
        (row) => options.get(row.answerOptionId) ?? [],
      )
      const entered = new Map<string, Set<string>>()
      for (const input of answer ? (inputsByAnswer.get(answer.id) ?? []) : []) {
        const keys = entered.get(input.answerOptionId) ?? new Set<string>()
        keys.add(input.inputKey)
        entered.set(input.answerOptionId, keys)
      }

      const state = answerState(question, answer, optionsByQuestion.get(question.id) ?? [], chosen, inputKeys, entered)
      if (state !== 'unanswered') startedCount += 1
      if (state === 'complete') completeCount += 1
    }

    return {
      characterId,
      status: statusOf(questions.length, completeCount, startedCount),
      askedCount: questions.length,
      completeCount,
    }
  })
}
