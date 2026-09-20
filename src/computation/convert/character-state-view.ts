import { compareIds, type RunState } from '@/engine'
import { UnknownIdError } from '../errors/unknownIdError'
import type { CharacterStateView, ResourceView, ScaleView } from '../types/character-state-view'
import type { ConfigRows } from '../types/config-rows'
import type { IdDirectory } from '../types/id-directory'

const byKey = (a: { key: string }, b: { key: string }): number => compareIds(a.key, b.key)

export const characterStateView = (
  state: RunState,
  characterId: string,
  config: ConfigRows,
  directory: IdDirectory,
): CharacterStateView => {
  const character = state.characters[characterId]
  if (!character) throw new UnknownIdError('character', characterId, 'to_database')

  const characterDbId = directory.characters.toDb(characterId)
  const scaleLabels = new Map(config.scales.map((scale) => [scale.key, scale.label]))
  const resourceLabels = new Map(config.resources.map((resource) => [resource.key, resource.label]))

  const resourceViews = (values: Record<string, number>): ResourceView[] =>
    Object.entries(values)
      .map(([key, value]) => ({ key, label: resourceLabels.get(key) ?? key, value }))
      .sort(byKey)

  const scales: ScaleView[] = []
  for (const pair of config.characterScales) {
    if (pair.characterId !== characterDbId) continue

    const key = directory.scales.toExternal(pair.scaleId)
    const value = character.scales[key]
    if (value === undefined) throw new UnknownIdError('scale value', pair.externalId, 'to_config')

    scales.push({
      externalId: pair.externalId,
      key,
      label: scaleLabels.get(key) ?? key,
      min: pair.minValue,
      max: pair.maxValue,
      value,
    })
  }

  const view: CharacterStateView = { characterId, scales: scales.sort(byKey), resources: resourceViews(character.resources) }

  const household = character.householdId === undefined ? undefined : state.households[character.householdId]
  if (character.householdId !== undefined && household) {
    view.household = {
      householdId: character.householdId,
      partnerIds: household.memberIds.filter((memberId) => memberId !== characterId),
      resources: resourceViews(household.resources),
    }
  }

  return view
}
