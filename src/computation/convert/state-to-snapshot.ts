import type { RunState, TraceEntry } from '@/engine'
import { KEY_SEPARATOR } from '../constants/key-separator'
import { UnknownIdError } from '../errors/unknownIdError'
import type { IdDirectory } from '../types/id-directory'
import type { SnapshotRows } from '../types/snapshot-rows'

/** Households the state has and the database does not yet: founded by this computation. */
export const householdsToCreate = (state: RunState, directory: IdDirectory): string[] =>
  Object.keys(state.households).filter((householdId) => !directory.households.has(householdId))

/**
 * Last raw value per clamped scale. A scale that hit a bound anywhere in the
 * computation is reported, even if a later shift brought it back inside: the
 * weights were off either way (§4.1).
 */
const clampedRawValues = (trace: readonly TraceEntry[]): Map<string, number> => {
  const raw = new Map<string, number>()
  for (const entry of trace) {
    if (entry.kind === 'clamp') raw.set(`${entry.characterId}${KEY_SEPARATOR}${entry.scaleKey}`, entry.raw)
  }

  return raw
}

/**
 * `RunState` → rows of the snapshot tables.
 *
 * The selected variants are written for the whole run, not only for the chapter
 * this computation decided: the next chapter starts from this snapshot alone,
 * and the engine needs every earlier selection to tell which questions were
 * asked (§4.5). One computation still has at most one variant per block.
 */
export const stateToSnapshot = (
  state: RunState,
  trace: readonly TraceEntry[],
  directory: IdDirectory,
): SnapshotRows => {
  const rows: SnapshotRows = {
    scaleValues: [],
    resourceValues: [],
    memberships: [],
    householdResourceValues: [],
    selectedVariations: [],
  }
  const clamped = clampedRawValues(trace)

  for (const [externalId, character] of Object.entries(state.characters)) {
    const characterId = directory.characters.toDb(externalId)

    for (const [key, value] of Object.entries(character.scales)) {
      const rawValue = clamped.get(`${externalId}${KEY_SEPARATOR}${key}`) ?? null
      rows.scaleValues.push({
        characterId,
        scaleId: directory.scales.toDb(key),
        value,
        rawValue,
        wasClamped: rawValue !== null,
      })
    }
    for (const [key, value] of Object.entries(character.resources)) {
      rows.resourceValues.push({ characterId, resourceId: directory.resources.toDb(key), value })
    }
    if (character.householdId !== undefined) {
      rows.memberships.push({ characterId, householdId: directory.households.toDb(character.householdId) })
    }
  }

  for (const [externalId, household] of Object.entries(state.households)) {
    const householdId = directory.households.toDb(externalId)
    for (const [key, value] of Object.entries(household.resources)) {
      rows.householdResourceValues.push({ householdId, resourceId: directory.resources.toDb(key), value })
    }
  }

  const selected = [...Object.values(state.selectedVariants.characters), ...Object.values(state.selectedVariants.groups)]
  for (const externalId of selected.flat()) {
    const blockVariationId = directory.variations.toDb(externalId)
    const placement = directory.placements.get(blockVariationId)
    if (!placement) throw new UnknownIdError('variation', externalId, 'to_database')

    rows.selectedVariations.push({ blockId: placement.blockId, blockVariationId })
  }

  return rows
}
