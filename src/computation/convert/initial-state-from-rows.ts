import { type RunState } from '@/engine'
import type { ConfigRows } from '../types/config-rows'
import type { IdDirectory } from '../types/id-directory'
import type { SnapshotRows } from '../types/snapshot-rows'
import { snapshotToState } from './snapshot-to-state'

/** Nothing is computed before chapter 1. */
const RUN_START = 0

/** A joint account the sheet gives no opening balance; the engine starts it the same way. */
const EMPTY_BALANCE = 0

/**
 * The state the run starts from, read from the config tables (§4.3) — what the
 * UI shows under chapter 1's questionnaire. Must agree with the engine's
 * `createInitialState` over the same workbook; a test holds the two together.
 */
export const initialStateFromRows = (config: ConfigRows, directory: IdDirectory): RunState => {
  const rows: SnapshotRows = {
    scaleValues: [],
    resourceValues: [],
    memberships: [],
    householdResourceValues: [],
    selectedVariations: [],
  }

  for (const scale of config.characterScales) {
    rows.scaleValues.push({
      characterId: scale.characterId,
      scaleId: scale.scaleId,
      value: scale.defaultValue,
      rawValue: null,
      wasClamped: false,
    })
  }
  for (const resource of config.characterResources) {
    rows.resourceValues.push({
      characterId: resource.characterId,
      resourceId: resource.resourceId,
      value: resource.defaultValue,
    })
  }

  const startingHouseholdIds = new Set<string>()
  for (const character of config.characters) {
    if (character.defaultHouseholdId === null) continue
    startingHouseholdIds.add(character.defaultHouseholdId)
    rows.memberships.push({ characterId: character.id, householdId: character.defaultHouseholdId })
  }

  const openingBalances = new Map<string, Map<string, number>>()
  for (const balance of config.householdResources) {
    const perResource = openingBalances.get(balance.householdId) ?? new Map<string, number>()
    perResource.set(balance.resourceId, balance.defaultValue)
    openingBalances.set(balance.householdId, perResource)
  }
  for (const householdId of startingHouseholdIds) {
    for (const resource of config.resources) {
      if (resource.scope !== 'household') continue
      const value = openingBalances.get(householdId)?.get(resource.id) ?? EMPTY_BALANCE
      rows.householdResourceValues.push({ householdId, resourceId: resource.id, value })
    }
  }

  return snapshotToState(rows, RUN_START, directory)
}
