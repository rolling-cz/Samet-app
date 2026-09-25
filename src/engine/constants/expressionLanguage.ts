/**
 * The condition language (§4.5). The engine owns it; the import only reports
 * syntax problems in the author's words, so both read the same definition.
 */

/**
 * Always-true fallback variant (§8.2). An empty cell means exactly the same
 * thing, so nothing downstream may tell the two apart.
 */
export const DEFAULT_CONDITION = 'DEFAULT'

/** The only function a condition may call (§4.5). */
export const RANDOM_FUNCTION = 'RANDOM'

/** `RANDOM(n)` takes a probability in percent. */
export const RANDOM_MIN_PERCENT = 0

export const RANDOM_MAX_PERCENT = 100

/**
 * A stored roll is 1–100, so `RANDOM(p)` holds exactly when the roll is at most
 * `p`: `RANDOM(100)` is always true and `RANDOM(0)` never (§7.4).
 */
export const ROLL_MIN = 1

export const ROLL_MAX = 100

/**
 * `???` marks a reference the author has not written yet, as in
 * `A_Ivan_1_???_Dari_Ne`. `?` means nothing else in the language.
 */
export const PLACEHOLDER_MARK = '?'

/** ID prefixes from §4.2. */
export const ANSWER_PREFIX = 'A_'

export const SCALE_PREFIX = 'S_'

export const RESOURCE_PREFIX = 'R_'

/** Forces the personal account even in a marriage (§4.4). */
export const PRIVATE_SUFFIX = '_private'

/** `S_<Postava>_<Skala>`: the owner carries no `_`, so the first one splits the ID. */
export const ID_SEPARATOR = '_'

/** `AND` binds tighter than `OR`, matching how the author reads the sheet. */
export const AND_OPERATOR = 'AND'

export const AND_PRECEDENCE = 2

export const OR_OPERATOR = 'OR'

export const OR_PRECEDENCE = 1

export const NOT_OPERATOR = '!'

/** The author writes `=`; it is rewritten to `==` before parsing. */
export const COMPARISON_OPERATORS = Object.freeze(['==', '!=', '>', '<', '>=', '<='] as const)

export type ComparisonOperator = (typeof COMPARISON_OPERATORS)[number]
