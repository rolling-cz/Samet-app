import type { RunScope } from '@/db'
import { characterResources, resources } from '@/db/schema'
import type { ParsedConfig } from '../types/parsed-config'
import type { IdMap } from './entity-ids'
import type { WrittenRows } from './written-rows'

/**
 * Resources (§4.2, sheet `Resources`).
 *
 * `scope` sits on the definition, not on the pair: whether `Wealth` can live on
 * a joint account is a property of the resource (§4.4), and the validation has
 * already rejected rows that disagree.
 */
export const upsertResources = async (
  scope: RunScope,
  config: ParsedConfig,
  written: WrittenRows,
  characterIds: IdMap,
): Promise<IdMap> => {
  const resourceIds: IdMap = new Map()

  for (const row of config.resources) {
    if (resourceIds.has(row.key)) continue

    const values = { label: row.label, scope: row.scope }
    const [definition] = await scope
      .insert(resources, { key: row.key, ...values })
      .onConflictDoUpdate({ target: [resources.runId, resources.key], set: values })
      .returning({ id: resources.id })
    if (!definition) continue

    written.resources.add(definition.id)
    resourceIds.set(row.key, definition.id)
  }

  for (const row of config.resources) {
    const characterId = row.characterId ? characterIds.get(row.characterId) : undefined
    const resourceId = resourceIds.get(row.key)
    if (!characterId || !resourceId) continue

    const values = { defaultValue: row.defaultValue }
    const [assignment] = await scope
      .insert(characterResources, {
        characterId,
        resourceId,
        externalId: row.externalId,
        ...values,
      })
      .onConflictDoUpdate({
        target: [
          characterResources.runId,
          characterResources.characterId,
          characterResources.resourceId,
        ],
        set: { externalId: row.externalId, ...values },
      })
      .returning({ id: characterResources.id })
    if (assignment) written.characterResources.add(assignment.id)
  }

  return resourceIds
}
