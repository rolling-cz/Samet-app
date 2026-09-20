import type { Sourced } from './sourced'

/** One row of the `Groups` sheet (§4.2): the registry of groups. */
export interface ParsedGroup extends Sourced {
  externalId: string
  name: string
  /** Members as the author wrote them; resolved against the registry later. */
  memberRefs: string[]
  /** The leader, when the sheet names one. */
  leaderRef?: string
}
