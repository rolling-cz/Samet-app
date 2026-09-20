import type { RunScope } from '@/db'
import { characterScales, scales } from '@/db/schema'
import type { ParsedConfig } from '../types/parsed-config'
import type { IdMap } from './entity-ids'
import type { WrittenRows } from './written-rows'

/**
 * Scales (§4.2, sheet `Scales`).
 *
 * The definition is per run and key; the range and the starting value are per
 * pair character × scale, because two characters may run the same scale on
 * different bounds.
 */
export const upsertScales = async (
  scope: RunScope,
  config: ParsedConfig,
  written: WrittenRows,
  characterIds: IdMap,
): Promise<IdMap> => {
  const scaleIds: IdMap = new Map()

  for (const row of config.scales) {
    if (scaleIds.has(row.key)) continue

    const values = { label: row.label }
    const [definition] = await scope
      .insert(scales, { key: row.key, ...values })
      .onConflictDoUpdate({ target: [scales.runId, scales.key], set: values })
      .returning({ id: scales.id })
    if (!definition) continue

    written.scales.add(definition.id)
    scaleIds.set(row.key, definition.id)
  }

  for (const row of config.scales) {
    const characterId = row.characterId ? characterIds.get(row.characterId) : undefined
    const scaleId = scaleIds.get(row.key)
    if (!characterId || !scaleId) continue

    const values = { minValue: row.min, maxValue: row.max, defaultValue: row.defaultValue }
    const [assignment] = await scope
      .insert(characterScales, { characterId, scaleId, externalId: row.externalId, ...values })
      .onConflictDoUpdate({
        target: [characterScales.runId, characterScales.characterId, characterScales.scaleId],
        set: { externalId: row.externalId, ...values },
      })
      .returning({ id: characterScales.id })
    if (assignment) written.characterScales.add(assignment.id)
  }

  return scaleIds
}
