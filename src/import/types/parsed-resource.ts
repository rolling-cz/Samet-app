import type { Sourced } from './sourced'

/**
 * One row of the `Resources` sheet: an owner, a resource and its starting
 * value (§4.2).
 *
 * The owner is usually a character, but may be a household ID — then the
 * default is the joint account's opening balance, and only a household from the
 * `Household` column may have such a row (§4.2).
 *
 * No `Min` / `Max`: a resource is unbounded and never clamped (§4.1). `scope`
 * says whether it can also live on a joint account (§4.4); it describes the
 * resource, so rows disagreeing about it are a validation problem.
 */
export interface ParsedResourceRow extends Sourced {
  /** `R_<Vlastnik>_<Zdroj>`, assembled from the two columns. */
  externalId: string
  /** What the author typed in the `Character` column. */
  characterRef: string
  /** Registry ID it resolved to; undefined for a household row or a typo. */
  characterId?: string
  /**
   * Household the row belongs to, when the owner is one. Set even for a
   * household the `Household` column does not name — the validation reports it.
   */
  householdRef?: string
  key: string
  label: string
  scope: 'private' | 'household'
  /** Starting value for chapter 1. */
  defaultValue: number
}
