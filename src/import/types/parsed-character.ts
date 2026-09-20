import type { IssueLocation } from './issue'
import type { Sourced } from './sourced'

/**
 * One row of the `Characters` sheet (§4.2).
 *
 * Starting values are deliberately absent: they live in `Scales` and
 * `Resources`, per pair of character × scale / resource. Nothing else about a
 * character is modelled — characterisation is fixed template text (§4.6).
 */
export interface ParsedCharacter extends Sourced {
  externalId: string
  firstName: string
  lastName: string
  /**
   * The `Household` column (§4.2): the household the character starts chapter 1
   * in. Empty when they start single.
   */
  householdRef?: string
  /** Where the `Household` cell is, so its validation can point at it. */
  householdLocation: IssueLocation
}
