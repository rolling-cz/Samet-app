import type {
  answerInputValues,
  answerOptions,
  answerSelectedOptions,
  answers,
  characters,
  effectInputs,
  effects,
  questions,
} from '@/db/schema'

/**
 * What the questionnaire shows beyond `ConfigRows`: the wording, who a question
 * is for, and the effects that raise `{input}` fields or name a `*_direct` target.
 */
export interface QuestionnaireRows {
  characters: Pick<typeof characters.$inferSelect, 'id' | 'externalId' | 'firstName' | 'lastName'>[]
  questions: Pick<
    typeof questions.$inferSelect,
    'id' | 'text' | 'helpText' | 'source' | 'pollQuestionId'
  >[]
  answerOptions: Pick<typeof answerOptions.$inferSelect, 'id' | 'referencedCharacterId' | 'isOther'>[]
  effects: Pick<
    typeof effects.$inferSelect,
    | 'id'
    | 'answerOptionId'
    | 'ordinal'
    | 'kind'
    | 'characterId'
    | 'relatedCharacterId'
    | 'scaleId'
    | 'resourceId'
    | 'resourceTarget'
    | 'householdExternalId'
  >[]
  effectInputs: Pick<typeof effectInputs.$inferSelect, 'effectId' | 'ordinal' | 'inputKey'>[]
}

/** One chapter's answers with who entered them — `AnswerRows` plus what only the questionnaire shows. */
export interface EnteredAnswerRows {
  answers: Pick<
    typeof answers.$inferSelect,
    'id' | 'chapterId' | 'questionId' | 'boolValue' | 'numericValue' | 'textValue' | 'answeredBy' | 'answeredAt'
  >[]
  selectedOptions: Pick<typeof answerSelectedOptions.$inferSelect, 'answerId' | 'answerOptionId'>[]
  inputValues: Pick<typeof answerInputValues.$inferSelect, 'answerId' | 'answerOptionId' | 'inputKey' | 'value'>[]
}
