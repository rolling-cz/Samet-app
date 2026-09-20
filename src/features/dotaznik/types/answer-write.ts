export interface InputValueWrite {
  optionId: string
  inputKey: string
  value: number
}

/** One question's answer as the database stores it, in workbook IDs. */
export interface AnswerWrite {
  boolValue: boolean | null
  numericValue: number | null
  textValue: string | null
  /** Empty for `bool` and `*_direct`, whose value is the answer. */
  selectedOptionIds: string[]
  inputValues: InputValueWrite[]
}

/** A field whose text is not a number the database could take. */
export interface InvalidField {
  /** Absent for the question's own number field. */
  optionId?: string
  inputKey?: string
}

export type DraftWarning = 'other_text_empty'

/**
 * What a draft amounts to. `cancel`: nothing in it is an answer — a `multi`
 * with its last option unticked, an emptied number — so the stored answer
 * ceases to exist rather than linger as an empty row (§6.1).
 */
export type DraftOutcome =
  | { _type: 'write'; write: AnswerWrite; warnings: DraftWarning[] }
  | { _type: 'cancel' }
  | { _type: 'invalid'; fields: InvalidField[] }
