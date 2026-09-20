/**
 * Where one question's autosave stands (§6.4). `failed` and `invalid` hold a
 * value the server does not have — the field keeps it and the org is told.
 */
export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'failed' | 'invalid'

/** Statuses that mean the screen shows something the database does not hold. */
export const UNSAVED_STATUSES: readonly SaveStatus[] = Object.freeze(['failed', 'invalid'])
