import { eq } from 'drizzle-orm'
import type { RunScope } from '@/db'
import {
  answerInputValues,
  answerOptions,
  answerSelectedOptions,
  answers,
  characters,
  effectInputs,
  effects,
  questions,
} from '@/db/schema'
import type { EnteredAnswerRows, QuestionnaireRows } from '../types/questionnaire-rows'

export const loadQuestionnaireRows = async (scope: RunScope): Promise<QuestionnaireRows> => ({
  characters: await scope.selectColumns(characters, {
    id: characters.id,
    externalId: characters.externalId,
    firstName: characters.firstName,
    lastName: characters.lastName,
  }),
  questions: await scope.selectColumns(questions, {
    id: questions.id,
    text: questions.text,
    helpText: questions.helpText,
    source: questions.source,
    pollQuestionId: questions.pollQuestionId,
  }),
  answerOptions: await scope.selectColumns(answerOptions, {
    id: answerOptions.id,
    referencedCharacterId: answerOptions.referencedCharacterId,
    isOther: answerOptions.isOther,
  }),
  effects: await scope.selectColumns(effects, {
    id: effects.id,
    answerOptionId: effects.answerOptionId,
    ordinal: effects.ordinal,
    kind: effects.kind,
    characterId: effects.characterId,
    relatedCharacterId: effects.relatedCharacterId,
    scaleId: effects.scaleId,
    resourceId: effects.resourceId,
    resourceTarget: effects.resourceTarget,
    householdExternalId: effects.householdExternalId,
  }),
  effectInputs: await scope.selectColumns(effectInputs, {
    effectId: effectInputs.effectId,
    ordinal: effectInputs.ordinal,
    inputKey: effectInputs.inputKey,
  }),
})

/**
 * One chapter's answers. Selected options and `{input}` values are read for the
 * run and matched by answer: a few hundred rows, and no join to get wrong.
 */
export const loadEnteredAnswerRows = async (scope: RunScope, chapterId: string): Promise<EnteredAnswerRows> => {
  const answerRows = await scope.selectColumns(
    answers,
    {
      id: answers.id,
      chapterId: answers.chapterId,
      questionId: answers.questionId,
      boolValue: answers.boolValue,
      numericValue: answers.numericValue,
      textValue: answers.textValue,
      answeredBy: answers.answeredBy,
      answeredAt: answers.answeredAt,
    },
    eq(answers.chapterId, chapterId),
  )
  const answerIds = new Set(answerRows.map((answer) => answer.id))
  const selectedOptions = await scope.selectColumns(answerSelectedOptions, {
    answerId: answerSelectedOptions.answerId,
    answerOptionId: answerSelectedOptions.answerOptionId,
  })
  const inputValues = await scope.selectColumns(answerInputValues, {
    answerId: answerInputValues.answerId,
    answerOptionId: answerInputValues.answerOptionId,
    inputKey: answerInputValues.inputKey,
    value: answerInputValues.value,
  })

  return {
    answers: answerRows,
    selectedOptions: selectedOptions.filter((row) => answerIds.has(row.answerId)),
    inputValues: inputValues.filter((row) => answerIds.has(row.answerId)),
  }
}
