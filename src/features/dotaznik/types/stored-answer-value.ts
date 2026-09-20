/** An answer as the audit holds it (`value_before` / `value_after`), in workbook IDs. */
export interface StoredAnswerValue {
  boolValue: boolean | null
  numericValue: number | null
  textValue: string | null
  selectedOptionIds: string[]
  inputValues: Record<string, Record<string, number>>
}
