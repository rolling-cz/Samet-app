import type { IssueLocation } from './issue'
import type { Sourced } from './sourced'

/**
 * A household the game starts with — one distinct value of the `Household`
 * column in `Characters` (§4.2).
 *
 * It is not a row of its own anywhere: the ID is derived from the members, and
 * the members are everyone who wrote the same value. `memberIds` may hold a
 * number other than two, which is exactly what the validation reports.
 */
export interface ParsedHousehold extends Sourced {
  /** The value as written, e.g. `MarieMirek`. */
  externalId: string
  memberIds: string[]
  /** Where each member wrote it, so a message can point at every row. */
  memberLocations: IssueLocation[]
}
