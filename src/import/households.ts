/**
 * Households the game starts with, collected from the `Household` column of
 * `Characters` (§4.2).
 *
 * Grouping by the written value rather than by pairs of characters is what
 * lets the validation say what is wrong: a value only one character carries,
 * or three, is a mistake worth naming, and a value that does not match the
 * pair's derived ID is a different mistake again.
 */
import type { ParsedCharacter } from './types/parsed-character'
import type { ParsedHousehold } from './types/parsed-household'

export const collectDefaultHouseholds = (characters: ParsedCharacter[]): ParsedHousehold[] => {
  const byRef = new Map<string, ParsedHousehold>()

  for (const character of characters) {
    const ref = character.householdRef
    if (ref === undefined) continue

    const household = byRef.get(ref)
    if (household) {
      household.memberIds.push(character.externalId)
      household.memberLocations.push(character.householdLocation)
      continue
    }

    byRef.set(ref, {
      externalId: ref,
      memberIds: [character.externalId],
      memberLocations: [character.householdLocation],
      location: character.householdLocation,
    })
  }

  return [...byRef.values()]
}
