import type { RunScope } from '@/db'
import { characters } from '@/db/schema'
import type { ParsedConfig } from '../types/parsed-config'
import type { IdMap } from './entity-ids'
import type { WrittenRows } from './written-rows'

export const upsertCharacters = async (
  scope: RunScope,
  config: ParsedConfig,
  written: WrittenRows,
  groupIds: IdMap,
): Promise<IdMap> => {
  const characterIds: IdMap = new Map()
  // Membership is listed by the group, not by the character (§4.2); the first
  // group naming someone is their home group.
  const homeGroup = new Map<string, string>()
  for (const group of config.groups) {
    for (const member of group.memberRefs) {
      if (!homeGroup.has(member)) homeGroup.set(member, group.externalId)
    }
  }

  for (const character of config.characters) {
    const group = homeGroup.get(character.externalId)
    const values = {
      firstName: character.firstName,
      lastName: character.lastName,
      homeGroupId: group ? (groupIds.get(group) ?? null) : null,
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
