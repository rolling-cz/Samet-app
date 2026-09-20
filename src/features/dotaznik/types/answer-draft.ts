/**
 * What the form holds for one question. Numbers stay as the text the org typed,
 * so a bad one remains in its field instead of vanishing; an empty text is "not
 * entered", never a zero (§4.4, §6.3).
 */
export interface AnswerDraft {
  boolValue: boolean | null
  selectedOptionIds: string[]
  /** `scale_direct` / `resource_direct`. */
  numberText: string
  /** Free text behind `_OTHER_`. */
  otherText: string
  /** Option ID → placeholder name → text. */
  inputTexts: Record<string, Record<string, string>>
}
