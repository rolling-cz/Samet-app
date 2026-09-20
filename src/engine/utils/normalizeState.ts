/**
 * Sorted keys throughout, so two runs over the same input serialise to the same
 * bytes whatever order the phases touched things in (§2).
 */
import { compareIds } from './compareIds'
import type { CharacterState, HouseholdState, RunState } from '../types/state'

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

  return { completedChapter: state.completedChapter, characters, households }
}
