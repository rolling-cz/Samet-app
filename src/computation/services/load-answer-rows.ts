import type { RunScope } from '@/db'
import { answerInputValues, answerSelectedOptions, answers, diceRolls } from '@/db/schema'
import type { AnswerRows, RollRow } from '../types/answer-rows'

/** Every chapter's answers; the converter keeps the ones up to the computed chapter. */
export const loadAnswerRows = async (scope: RunScope): Promise<AnswerRows> => ({
  answers: await scope.selectColumns(answers, {
    id: answers.id,
    chapterId: answers.chapterId,
    questionId: answers.questionId,
    boolValue: answers.boolValue,
    numericValue: answers.numericValue,
    textValue: answers.textValue,
  }),
  selectedOptions: await scope.selectColumns(answerSelectedOptions, {
    answerId: answerSelectedOptions.answerId,
    answerOptionId: answerSelectedOptions.answerOptionId,
  }),
  inputValues: await scope.selectColumns(answerInputValues, {
    answerId: answerInputValues.answerId,
    answerOptionId: answerInputValues.answerOptionId,
    inputKey: answerInputValues.inputKey,
    value: answerInputValues.value,
  }),
})

export const loadRollRows = async (scope: RunScope): Promise<RollRow[]> =>
  scope.selectColumns(diceRolls, {
    blockVariationId: diceRolls.blockVariationId,
    occurrence: diceRolls.occurrence,
    value: diceRolls.value,
  })
