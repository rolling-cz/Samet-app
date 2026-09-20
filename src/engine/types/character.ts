/** Character registry entry (§4.2). */
import type { CharacterId, GroupId, HouseholdId } from './ids'

export interface CharacterDefinition {
  id: CharacterId
  firstName: string
  lastName: string
  /**
   * The household the character starts chapter 1 in, from the `Household`
   * column (§4.2). Absent means they start single — not a household of one.
   */
  initialHouseholdId?: HouseholdId
}

/**
 * Group registry entry (§4.6). Name and nothing else: a group owns document
 * blocks, but who belongs to it and who leads it is not state.
 */
export interface GroupDefinition {
  id: GroupId
  name: string
}
