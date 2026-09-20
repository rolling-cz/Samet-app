import type { RunScope } from '@/db'
import { characters } from '@/db/schema'
import type { ParsedConfig } from '../types/parsed-config'
import type { IdMap } from './entity-ids'
import type { WrittenRows } from './written-rows'

export const upsertCharacters = async (
  scope: RunScope,
  config: ParsedConfig,
  written: WrittenRows,
  householdIds: IdMap,
): Promise<IdMap> => {
  const characterIds: IdMap = new Map()

  for (const character of config.characters) {
    const values = {
      firstName: character.firstName,
      lastName: character.lastName,
      defaultHouseholdId: character.householdRef
        ? (householdIds.get(character.householdRef) ?? null)
        : null,
    }
    const [row] = await scope
      .insert(characters, { externalId: character.externalId, ...values })
      .onConflictDoUpdate({ target: [characters.runId, characters.externalId], set: values })
      .returning({ id: characters.id })
    if (!row) continue

    written.characters.add(row.id)
    characterIds.set(character.externalId, row.id)
  }

  return characterIds
}
