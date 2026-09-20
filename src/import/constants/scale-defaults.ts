/**
 * Fallbacks for the `Scales` and `Resources` sheets (§4.2).
 *
 * They are fallbacks, not the truth: `Min` and `Max` belong to the pair
 * character × scale and two characters may run the same scale on different
 * ranges. Nothing but the parser may assume these numbers.
 */

/** Used when `Min` is empty; 1–10 is what the author writes almost everywhere. */
export const DEFAULT_SCALE_MIN = 1

/** Used when `Max` is empty. */
export const DEFAULT_SCALE_MAX = 10

/** Used when a resource's `Default` is empty — an account starts at zero. */
export const DEFAULT_RESOURCE_VALUE = 0

/** Priorities in `N_Content` start at 1; lower is evaluated first (§8.2). */
export const MIN_VARIATION_PRIORITY = 1
