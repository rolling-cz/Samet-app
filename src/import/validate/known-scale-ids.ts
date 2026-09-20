import type { ParsedConfig } from '../types/parsed-config'

/**
 * Every impact ID the config can name (§4.2).
 *
 * Built from the `Scales` and `Resources` rows rather than from every
 * combination of character and key: a scale belongs to the pair, so
 * `S_Karel_Smutek` is a typo when Karel's row is not there, even though both
 * the character and the scale exist.
 *
 * A row whose character is not in the registry defines nothing — otherwise one
 * bad row in `Resources` would silently bless every impact naming it.
 */
export const knownScaleIds = (config: ParsedConfig): Set<string> =>
  new Set(config.scales.filter((row) => row.characterId).map((row) => row.externalId))

export const knownResourceIds = (config: ParsedConfig): Set<string> =>
  new Set(config.resources.filter((row) => row.characterId).map((row) => row.externalId))

/**
 * Resource IDs a condition may also name: the joint accounts (§4.4).
 *
 * A household's ID is derived from its members and may be written before the
 * household exists, so any pair of characters is a legitimate owner of a
 * `household` resource.
 */
export const householdResourceIds = (config: ParsedConfig): Set<string> => {
  const ids = new Set<string>()
  const shared = new Set(
    config.resources.filter((row) => row.scope === 'household').map((row) => row.key),
  )
  if (shared.size === 0) return ids

  const characters = config.characters.map((character) => character.externalId)
  for (const first of characters) {
    for (const second of characters) {
      if (first >= second) continue
      for (const key of shared) ids.add(`R_${first}${second}_${key}`)
    }
  }

  return ids
}
