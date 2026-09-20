/**
 * How far a character's questionnaire is (§6.4). Measured by what would stop
 * the computation or come back as `unresolved_value`: every asked question
 * answered, every `*_direct` number and every `{input}` of a chosen option typed in.
 */
export type CompletionStatus = 'empty' | 'in_progress' | 'done'

/** One question's answer: a row nobody entered, one still missing a number, or all there. */
export type AnswerState = 'unanswered' | 'incomplete' | 'complete'

export interface CharacterCompletion {
  /** `Marie`. */
  characterId: string
  status: CompletionStatus
  /** Questions asked in the chapter; `0` is a character with nothing to fill in — done, and said so. */
  askedCount: number
  completeCount: number
}

export type ChapterCompletion =
  | { _type: 'ready'; characters: CharacterCompletion[] }
  | { _type: 'blocked'; missingChapter: number }

export interface CompletionSummary {
  done: number
  total: number
}
