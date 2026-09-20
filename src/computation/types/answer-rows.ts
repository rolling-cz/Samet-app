import type { answerInputValues, answerSelectedOptions, answers, diceRolls } from '@/db/schema'

/** Everything entered against the questionnaire, as the database holds it. */
export interface AnswerRows {
  answers: Pick<
    typeof answers.$inferSelect,
    'id' | 'chapterId' | 'questionId' | 'boolValue' | 'numericValue' | 'textValue'
  >[]
  selectedOptions: Pick<typeof answerSelectedOptions.$inferSelect, 'answerId' | 'answerOptionId'>[]
  inputValues: Pick<typeof answerInputValues.$inferSelect, 'answerId' | 'answerOptionId' | 'inputKey' | 'value'>[]
}

export type RollRow = Pick<typeof diceRolls.$inferSelect, 'blockVariationId' | 'occurrence' | 'value'>
