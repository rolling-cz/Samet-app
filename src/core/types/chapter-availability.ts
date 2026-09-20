/**
 * Whether a chapter's screens have anything to stand on. Chapter N ≥ 2 builds on
 * the computation of chapter N−1: its questionnaire is a lookup in the variants
 * selected there and the state under it is that snapshot (§4.3, §4.5).
 */
export type ChapterAvailability =
  | { _type: 'open' }
  | { _type: 'blocked'; missingChapter: number }
