import type { ConfigRows } from './config-rows'

/** A question put to the org in a chapter, with the workbook ID of whose it is. */
export type AskedQuestion = ConfigRows['questions'][number] & {
  /** `Marie`; every asked question has a character — a `poll` is never asked on its own. */
  characterExternalId: string
}

/**
 * Without the baseline computation of the chapter before there is no telling
 * which questions are asked — and showing all of them would ask ones that were
 * never meant to be.
 */
export type AskedQuestions =
  | { _type: 'ready'; questions: AskedQuestion[] }
  | { _type: 'blocked'; missingChapter: number }
