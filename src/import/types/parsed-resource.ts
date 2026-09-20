import type { Sourced } from './sourced'

/**
 * One row of the `Resources` sheet: a character, a resource and its starting
 * value (§4.2).
 *
 * No `Min` / `Max`: a resource is unbounded and never clamped (§4.1). `scope`
 * says whether it can also live on a joint account (§4.4); it describes the
 * resource, so rows disagreeing about it are a validation problem.
 */
export interface ParsedResourceRow extends Sourced {
  /** `R_<Postava>_<Zdroj>`, assembled from the two columns. */
  externalId: string
  characterRef: string
  characterId?: string
  key: string
  label: string
  scope: 'private' | 'household'
  /** Starting value for chapter 1. */
  defaultValue: number
}
