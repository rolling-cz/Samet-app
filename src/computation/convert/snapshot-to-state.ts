import { normalizeState, type CharacterState, type HouseholdState, type RunState, type SelectedVariants } from '@/engine'
import { UnknownIdError } from '../errors/unknownIdError'
import type { IdDirectory } from '../types/id-directory'
import type { SnapshotRows } from '../types/snapshot-rows'

const householdOf = (households: Record<string, HouseholdState>, householdId: string): HouseholdState => {
  const household = households[householdId] ?? { memberIds: [], resources: {} }
  households[householdId] = household

  return household
}

/** Snapshot rows → the `RunState` the next chapter starts from; the inverse of `stateToSnapshot`. */
export const snapshotToState = (rows: SnapshotRows, completedChapter: number, directory: IdDirectory): RunState => {
  // Every registered character has a state, even one who tracks nothing.
  const characters: Record<string, CharacterState> = {}
  for (const characterId of directory.characters.allExternal()) characters[characterId] = { scales: {}, resources: {} }

  const characterOf = (id: string): CharacterState => {
    const character = characters[directory.characters.toExternal(id)]
    if (!character) throw new UnknownIdError('character', id, 'to_config')

    return character
  }

  for (const row of rows.scaleValues) characterOf(row.characterId).scales[directory.scales.toExternal(row.scaleId)] = row.value
  for (const row of rows.resourceValues) {
    characterOf(row.characterId).resources[directory.resources.toExternal(row.resourceId)] = row.value
  }

  const households: Record<string, HouseholdState> = {}
  for (const row of rows.memberships) {
    const householdId = directory.households.toExternal(row.householdId)
    characterOf(row.characterId).householdId = householdId
    householdOf(households, householdId).memberIds.push(directory.characters.toExternal(row.characterId))
  }
  for (const row of rows.householdResourceValues) {
    const household = householdOf(households, directory.households.toExternal(row.householdId))
    household.resources[directory.resources.toExternal(row.resourceId)] = row.value
  }

  const selectedVariants: SelectedVariants = { characters: {}, groups: {} }
  for (const row of rows.selectedVariations) {
    const placement = directory.placements.get(row.blockVariationId)
    if (!placement) throw new UnknownIdError('variation', row.blockVariationId, 'to_config')

    const owners = placement.owner.ownerKind === 'character' ? selectedVariants.characters : selectedVariants.groups
    const variationIds = owners[placement.owner.ownerId] ?? []
    variationIds.push(directory.variations.toExternal(row.blockVariationId))
    owners[placement.owner.ownerId] = variationIds
  }

  return normalizeState({ completedChapter, characters, households, selectedVariants })
}
