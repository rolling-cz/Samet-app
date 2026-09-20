/** Words the author writes by hand into cells, and what they mean. */

export const QUESTION_TYPES = Object.freeze([
  'bool',
  'single',
  'multi',
  'poll',
  'poll-answer',
  'scale_direct',
  'resource_direct',
] as const)

/** Types that set a value absolutely and must name a concrete account (§4.4). */
export const DIRECT_QUESTION_TYPES = Object.freeze(['scale_direct', 'resource_direct'])

/** Structural effects an answer may carry directly (layer 2). */
export const ANSWER_EFFECTS = Object.freeze(['SNATEK', 'ROZVOD', 'VEDENI', 'CLENSTVI'] as const)

/** Effects whose argument is a character ID. */
export const CHARACTER_ARGUMENT_EFFECTS = Object.freeze(['SNATEK', 'ROZVOD'])

/** Effects whose argument is a group ID. */
export const GROUP_ARGUMENT_EFFECTS = Object.freeze(['VEDENI', 'CLENSTVI'])

/** Spellings of the `hrac` question source (§6.7), lowercased. */
export const PLAYER_SOURCE_WORDS = Object.freeze(['hráč', 'hrac', 'hráčka', 'hracka'])

export const ORG_SOURCE_WORD = 'org'

/** Truthy spellings in boolean columns such as `Private`, lowercased. */
export const YES_WORDS = Object.freeze(['ano', 'true', 'x', '1'])

/**
 * The two answers of a `bool` question (§6.1). The rows exist only to hold
 * effects; the answer is recognised by its text, not by row order, and a
 * missing row is filled in with no effects.
 */
export const BOOL_ANSWER_TEXTS = Object.freeze(['Ano', 'Ne'] as const)

export type BoolAnswerText = (typeof BOOL_ANSWER_TEXTS)[number]

/** Resource scopes as the `Resources` sheet spells them (§4.4). */
export const RESOURCE_SCOPES = Object.freeze(['private', 'household'] as const)

/** Answer ID suffix or answer text marking free text filled in by the org. */
export const OTHER_ANSWER_MARKER = '_OTHER_'

/** Separators accepted in list cells (`Blocks`, `Effects`, impacts). */
export const LIST_SEPARATOR = /[,;]/

/** Separator between group members in the `Groups` sheet. */
export const MEMBER_SEPARATOR = /[,;]/
