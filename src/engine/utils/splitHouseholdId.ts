/**
 * `MarieMirek` back into its two members, or nothing when the value is not two
 * registry IDs glued together in alphabetical order (§4.4).
 *
 * The ID is derived and stored nowhere, so every reader has to redo the split.
 */
import { householdExternalId } from './householdId'

export const splitHouseholdId = (
  owner: string,
  characterIds: readonly string[],
): [string, string] | undefined => {
  for (const first of characterIds) {
    if (!owner.startsWith(first)) continue

    const second = owner.slice(first.length)
    if (second === '' || second === first) continue
    for (const candidate of characterIds) {
      if (candidate !== second) continue
      // `MirekMarie` is a household written backwards, not a household.
      if (householdExternalId(first, second) !== owner) return undefined

      return [first, second]
    }
  }

  return undefined
}
