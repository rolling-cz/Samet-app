/** Digits only: `1e3`, `1.5` and `１２` are not what the org meant to type. */
export const UNSIGNED_WHOLE_NUMBER = /^\d+$/

/** A `*_direct` value may be negative — a scale's `Min` can be, and so can a debt. */
export const SIGNED_WHOLE_NUMBER = /^-?\d+$/

/** Postgres `integer`; anything larger would fail at the insert instead of at the field. */
export const MAX_STORED_INTEGER = 2_147_483_647
