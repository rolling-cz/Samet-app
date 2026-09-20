/** Sheet names and required columns of the config workbook (§4.2). */

/** Character registry. */
export const CHARACTERS_SHEET = 'Characters'

/** Group registry: ID and name; members and leadership are not state (§4.6). */
export const GROUPS_SHEET = 'Groups'

/**
 * Which scales a character has, on what range and from what starting value.
 * Chapter-independent: starting values are the state before chapter 1 (§4.2).
 */
export const SCALES_SHEET = 'Scales'

/** The same for resources, which have no `Min` / `Max` (§4.1). */
export const RESOURCES_SHEET = 'Resources'

/** Validation notes for the author; read by nobody but them. */
export const VALIDATIONS_SHEET = 'Validations'

/** Sheets that are documentation, not data. */
export const IGNORED_SHEETS = Object.freeze(['Legend', 'Legenda', 'NOTES', 'Poznamky'])

/** Per-chapter sheets are named `<chapter>_<kind>`, e.g. `2_Questions`. */
export const CHAPTER_SHEET_KINDS = Object.freeze(['Questions', 'Content'] as const)

export type ChapterSheetKind = (typeof CHAPTER_SHEET_KINDS)[number]

/** The game has exactly three chapters (§1). */
export const CHAPTERS = Object.freeze([1, 2, 3] as const)

/** `Household` names the household the character starts chapter 1 in (§4.2). */
export const CHARACTER_COLUMNS = Object.freeze(['ID', 'Name', 'Surname', 'Household'])

export const GROUP_COLUMNS = Object.freeze(['ID', 'Name'])

/** `ID` holds the whole `S_<Postava>_<Skala>`; `Character` repeats its owner. */
export const SCALE_COLUMNS = Object.freeze(['Character', 'ID', 'Min', 'Max', 'Default'])

/**
 * Resources have no bounds to give them (§4.1). `Character` may hold a
 * household ID instead — the joint account's opening balance (§4.2).
 */
export const RESOURCE_COLUMNS = Object.freeze(['Character', 'ID', 'Default'])

/** `Character` is written once per owner and carries down over their rows. */
export const SCALE_FILL_DOWN_COLUMNS = Object.freeze(['Character'])

export const QUESTION_COLUMNS = Object.freeze(['Character', 'Type', 'Text', 'Text response'])

/**
 * Columns merged over all answer rows of one question (§10.2).
 *
 * Only the owner carries down: `Type` marks where a question starts, so filling
 * it in would erase the boundary between two questions of the same character.
 */
export const QUESTION_FILL_DOWN_COLUMNS = Object.freeze(['Character'])

export const CONTENT_COLUMNS = Object.freeze([
  'Character',
  'Block ID',
  'Variation ID',
  'Variation Text',
  'Conditions',
])

/** `Character` and `Block ID` are filled only on the first row of a group (§8.2). */
export const CONTENT_FILL_DOWN_COLUMNS = Object.freeze(['Character', 'Block ID'])

/** The one column holding both scale and resource impacts (§4.2). */
export const IMPACT_COLUMN = 'Scale and Resources Impact'

/** The answer's own ID and label. */
export const ANSWER_ID_COLUMN = 'ID Answer'

export const ANSWER_LABEL_COLUMN = 'Text response'

/** Structural effects of an answer (§4.4, layer 2). */
export const EFFECTS_COLUMN = 'Effects'

/** A question-level condition; from chapter 2 on, a question may have one (§4.2). */
export const QUESTION_CONDITION_COLUMN = 'Condition'

/**
 * Optional question columns the author's sheet does not carry yet.
 *
 * `Source` separates org questions from players' (§6.7) — in the current sheet
 * the org simply has a character of its own. `Private` forces impacts to the
 * personal account (§4.4), `Blocks` switches blocks on from an answer.
 */
export const QUESTION_SOURCE_COLUMN = 'Source'

export const QUESTION_PRIVATE_COLUMN = 'Private'

export const ANSWER_BLOCKS_COLUMN = 'Blocks'

export const chapterSheetName = (chapter: number, kind: ChapterSheetKind): string =>
  `${chapter}_${kind}`
