import type { Sourced } from './sourced'

/**
 * One row of the `Groups` sheet (§4.2): the registry of groups.
 *
 * ID and name and nothing else — membership and leadership are expressed by
 * block variants, not tracked as state (§4.6).
 */
export interface ParsedGroup extends Sourced {
  externalId: string
  name: string
}
