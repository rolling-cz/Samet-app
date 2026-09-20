/**
 * The state the run starts from (§4.3): defaults from `Scales` and `Resources`
 * and the households from the `Household` column of `Characters`. From chapter
 * 2 on, `evaluate` starts from the previous chapter's result instead.
 */
import { buildCatalog } from './catalog/buildCatalog'
import { failIfAny, type EngineProblem } from './errors/engineInputError'
import type { EngineConfig } from './types/config'
import type { CharacterState, HouseholdState, RunState } from './types/state'
import { compareIds } from './utils/compareIds'
import { normalizeState } from './utils/normalizeState'

export const createInitialState = (config: EngineConfig): RunState => {
  const catalog = buildCatalog(config)
  const problems: EngineProblem[] = []

  const characters: Record<string, CharacterState> = {}
  for (const characterId of catalog.characterIds) characters[characterId] = { scales: {}, resources: {} }

  for (const scale of config.scales) {
    const character = characters[scale.characterId]
    if (character) character.scales[scale.key] = scale.defaultValue
  }

  const households: Record<string, HouseholdState> = {}
  for (const character of config.characters) {
    const householdId = character.initialHouseholdId
    if (householdId === undefined) continue
    const state = characters[character.id]
    if (state) state.householdId = householdId

    const household = households[householdId] ?? { memberIds: [], resources: {} }
    household.memberIds.push(character.id)
    household.memberIds.sort(compareIds)
    households[householdId] = household
  }
  for (const [householdId, household] of Object.entries(households)) {
    if (household.memberIds.length !== 2) {
      problems.push({ code: 'unknown_reference', subject: householdId, detail: `${household.memberIds.length} members, a household has two` })
    }
    for (const [key, scope] of catalog.resourceScopes) {
      if (scope === 'household') household.resources[key] = 0
    }
  }

  for (const resource of config.resources) {
    if (resource.owner.kind === 'character') {
      const character = characters[resource.owner.characterId]
      if (character) character.resources[resource.key] = resource.defaultValue
      continue
    }
    const household = households[resource.owner.householdId]
    // Only a household the game starts with may have an opening balance (§4.2).
    if (!household) {
      problems.push({ code: 'unknown_reference', subject: resource.externalId, detail: 'opening balance of a household nobody starts in' })
      continue
    }
    household.resources[resource.key] = resource.defaultValue
  }

  failIfAny(problems)

  return normalizeState({ completedChapter: 0, characters, households, selectedVariants: { characters: {}, groups: {} } })
}
