/**
 * Resolving what the author typed in a `Character` column to a registry ID.
 *
 * The real sheet writes `Věra` where the registry ID is `Vera`: the author
 * types the name they see, not the ID. Rejecting that would mean an error per
 * question for every character whose ID drops the diacritics, so the import
 * resolves the name and says so instead — the sheet is still worth fixing, but
 * it must not block the whole config.
 *
 * This tolerance applies only to the column saying whose question or block it
 * is. An answer option naming *another* character still has to carry the
 * registry ID (§6.6), because a marriage or a rename would break free text.
 */

/** Lowercases and strips diacritics, so `Věra` and `vera` compare equal. */
export const fold = (value: string): string => {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

export interface CharacterAliases {
  /** Exact registry IDs. */
  ids: Set<string>
  /** Folded alias to registry ID; an alias shared by two characters is dropped. */
  byAlias: Map<string, string>
}

export const buildAliases = (
  characters: { externalId: string; firstName: string; lastName: string }[],
): CharacterAliases => {
  const ids = new Set(characters.map((c) => c.externalId))
  const counts = new Map<string, Set<string>>()

  const note = (alias: string, id: string) => {
    const folded = fold(alias)
    if (folded === '') return
    const owners = counts.get(folded) ?? new Set<string>()
    owners.add(id)
    counts.set(folded, owners)
  }

  for (const character of characters) {
    note(character.externalId, character.externalId)
    note(character.firstName, character.externalId)
    if (character.firstName !== '' && character.lastName !== '') {
      note(`${character.firstName} ${character.lastName}`, character.externalId)
    }
  }

  const byAlias = new Map<string, string>()
  for (const [alias, owners] of counts) {
    // An ambiguous alias (two characters named Marie) resolves to nothing;
    // guessing would silently attach a question to the wrong character.
    const [only] = owners
    if (owners.size === 1 && only !== undefined) byAlias.set(alias, only)
  }

  return { ids, byAlias }
}

export type CharacterResolution =
  | { status: 'exact'; id: string }
  | { status: 'by_name'; id: string }
  | { status: 'unknown' }

export const resolveCharacter = (
  value: string,
  aliases: CharacterAliases,
): CharacterResolution => {
  if (value === '') return { status: 'unknown' }
  if (aliases.ids.has(value)) return { status: 'exact', id: value }
  const id = aliases.byAlias.get(fold(value))

  return id === undefined ? { status: 'unknown' } : { status: 'by_name', id }
}
