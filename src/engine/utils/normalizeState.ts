/**
 * Sorted keys throughout, so two runs over the same input serialise to the same
 * bytes whatever order the phases touched things in (§2).
 */
import { compareIds } from './compareIds'
import type { CharacterState, HouseholdState, RunState, SelectedVariants } from '../types/state'

const sortRecord = <T>(record: Record<string, T>): Record<string, T> => {
  const sorted: Record<string, T> = {}
  for (const key of Object.keys(record).sort(compareIds)) {
    const value = record[key]
    if (value !== undefined) sorted[key] = value
  }

  return sorted
}

const normalizeCharacter = (character: CharacterState): CharacterState => {
  const normalized: CharacterState = {
    scales: sortRecord(character.scales),
    resources: sortRecord(character.resources),
  }
  if (character.householdId !== undefined) normalized.householdId = character.householdId

  return normalized
}

const normalizeHousehold = (household: HouseholdState): HouseholdState => ({
  memberIds: [...household.memberIds].sort(compareIds),
  resources: sortRecord(household.resources),
})

const sortVariantIds = (byOwner: Record<string, string[]>): Record<string, string[]> => {
  const sorted: Record<string, string[]> = {}
  for (const ownerId of Object.keys(byOwner).sort(compareIds)) {
    const variationIds = byOwner[ownerId]
    if (variationIds) sorted[ownerId] = [...variationIds].sort(compareIds)
  }

  return sorted
}

const normalizeSelectedVariants = (selected: SelectedVariants): SelectedVariants => ({
  characters: sortVariantIds(selected.characters),
  groups: sortVariantIds(selected.groups),
})

export const normalizeState = (state: RunState): RunState => {
  const characters: Record<string, CharacterState> = {}
  for (const id of Object.keys(state.characters).sort(compareIds)) {
    const character = state.characters[id]
    if (character) characters[id] = normalizeCharacter(character)
  }

  const households: Record<string, HouseholdState> = {}
  for (const id of Object.keys(state.households).sort(compareIds)) {
    const household = state.households[id]
    if (household) households[id] = normalizeHousehold(household)
  }

  return {
    completedChapter: state.completedChapter,
    characters,
    households,
    selectedVariants: normalizeSelectedVariants(state.selectedVariants),
  }
}
