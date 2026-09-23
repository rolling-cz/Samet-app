/**
 * How many times the filler may walk the text replacing markers (§8.4).
 *
 * A variant's text may hold another `{BLOK …}`, so substitution runs in a loop.
 * Blocks nest a handful of levels at most — far below this. Reaching the limit
 * means a cycle the import validation missed, so it ends as a reported problem
 * rather than a hang.
 */
export const MAX_FILL_PASSES = 20
