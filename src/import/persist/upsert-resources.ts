import type { RunScope } from '@/db'
import { characterResources, householdResources, resources } from '@/db/schema'
import type { ParsedConfig } from '../types/parsed-config'
import type { ParsedResourceRow } from '../types/parsed-resource'
import type { IdMap } from './entity-ids'
import type { WrittenRows } from './written-rows'

/**
 * Resources (§4.2, sheet `Resources`).
 *
 * `scope` sits on the definition, not on the pair: whether `Wealth` can live on
 * a joint account is a property of the resource (§4.4), and the validation has
 * already rejected rows that disagree.
 *
 * A row owned by a household carries the joint account's opening balance
 * instead of a character's, so it lands in its own table.
 */
export const upsertResources = async (
  scope: RunScope,
  config: ParsedConfig,
  written: WrittenRows,
  characterIds: IdMap,
  householdIds: IdMap,
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
    const resourceId = resourceIds.get(row.key)
    if (!resourceId) continue

    if (row.householdRef !== undefined) {
      await upsertHouseholdResource(scope, written, row, resourceId, householdIds)
      continue
    }

    const characterId = row.characterId ? characterIds.get(row.characterId) : undefined
    if (!characterId) continue

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

const upsertHouseholdResource = async (
  scope: RunScope,
  written: WrittenRows,
  row: ParsedResourceRow,
  resourceId: string,
  householdIds: IdMap,
): Promise<void> => {
  const householdId = row.householdRef ? householdIds.get(row.householdRef) : undefined
  if (!householdId) return

  const values = { defaultValue: row.defaultValue }
  const [assignment] = await scope
    .insert(householdResources, {
      householdId,
      resourceId,
      externalId: row.externalId,
      ...values,
    })
    .onConflictDoUpdate({
      target: [
        householdResources.runId,
        householdResources.householdId,
        householdResources.resourceId,
      ],
      set: { externalId: row.externalId, ...values },
    })
    .returning({ id: householdResources.id })
  if (assignment) written.householdResources.add(assignment.id)
}
