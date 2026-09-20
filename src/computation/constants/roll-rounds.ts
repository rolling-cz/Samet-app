/**
 * How many times a computation may roll and evaluate again. A new roll can only
 * surface after an earlier one is decided, and blocks nest a handful of levels
 * at most — far below this. Reaching it means a loop, so it ends as an error.
 */
export const MAX_ROLL_ROUNDS = 20
