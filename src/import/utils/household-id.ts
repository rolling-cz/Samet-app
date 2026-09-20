/**
 * Splits `MarieMirek` back into its two members, or returns nothing when the
 * value is not two registry IDs glued together.
 *
 * The ID is derived and stored nowhere (see `householdExternalId`), so every
 * reader has to redo the split — including the one that tells `MirekMarie` (an
 * ID written backwards) from a misspelt character.
 */
export const splitHouseholdId = (
  owner: string,
  characterIds: Iterable<string>,
): [string, string] | undefined => {
  for (const first of characterIds) {
    if (!owner.startsWith(first)) continue

    const second = owner.slice(first.length)
    if (second === '' || second === first) continue
    for (const candidate of characterIds) {
      if (candidate === second) return [first, second]
    }
  }

  return undefined
}
