/** Edit distance always tolerated by "did you mean", however short the ID. */
export const MIN_SUGGESTION_DISTANCE = 2

/**
 * One tolerated edit per this many characters, so `S_Marie_Regme` still matches
 * `S_Marie_Regime` while two unrelated short IDs do not.
 */
export const CHARS_PER_SUGGESTION_EDIT = 5
