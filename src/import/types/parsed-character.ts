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
  /** Household the character starts in, when the sheet names one (§4.4). */
  householdRef?: string
}
