/**
 * Identifiers the engine works with (§4.2).
 *
 * All plain strings: the engine is a pure function and must not depend on how
 * the database spells a primary key (architecture rule 1). They are the IDs the
 * author writes in the workbook, which is also what the trace quotes back.
 */

export type CharacterId = string
export type GroupId = string

/** Both members' IDs sorted alphabetically and glued together (§4.4). */
export type HouseholdId = string

/** The `Regime` half of `S_Marie_Regime`; the range belongs to the pair (§4.1). */
export type ScaleKey = string

/** The `Wealth` half of `R_Marie_Wealth`. */
export type ResourceKey = string

export type QuestionId = string
export type AnswerOptionId = string

/** Template block `{BLOK <ID>}` (§8.4) and one of its variants (§8.2). */
export type BlockId = string
export type VariationId = string

/** The game has exactly three chapters (§3.1); a fourth would be a new run. */
export const CHAPTER_NUMBERS = Object.freeze([1, 2, 3] as const)

export type ChapterNumber = (typeof CHAPTER_NUMBERS)[number]

/**
 * Computing chapter N produces the material for chapter N+1: the questionnaire
 * and the documents handed out at its start. That is why the workbook has
 * `2_Content` and `3_Content` but no `1_Content` — chapter 1 starts from the
 * config alone, and the blocks of `2_Content` describe what chapter 1 did.
 */
export const NEXT_CHAPTER_OFFSET = 1
