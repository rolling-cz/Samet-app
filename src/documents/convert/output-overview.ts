/**
 * The Přehled tab from the same two things the documents are filled from: the
 * config read back from the archived `.xlsx` and the state before the chapter.
 * Sharing the inputs is the point — the overview and the printed document can
 * never disagree about a value or a variant.
 */
import { compareIds, type ChapterNumber, type EngineConfig, type RunState } from '@/engine'
import { personLabel } from '@/utils/person-label'
import { ownerBlocks } from '../fill/block-texts'
import type { DocumentOwner } from '../types/document'
import type { OutputOverview, OverviewEntry, OverviewResource, OverviewVariant } from '../types/overview'

export const outputOverview = (config: EngineConfig, state: RunState, chapter: ChapterNumber): OutputOverview => {
  const resourceLabels = new Map(config.resources.map((resource) => [resource.key, resource.label]))
  const labelsById = new Map(
    config.characters.map((character) => [character.id, personLabel(character.firstName, character.lastName, character.id)]),
  )

  const resourceList = (values: Record<string, number>): OverviewResource[] =>
    Object.entries(values)
      .sort(([a], [b]) => compareIds(a, b))
      .map(([key, value]) => ({ key, label: resourceLabels.get(key) ?? key, value }))

  const variantsOf = (owner: DocumentOwner): OverviewVariant[] =>
    ownerBlocks(config, state.selectedVariants, owner, chapter).map(({ block, variation }) => ({
      blockId: block.id,
      variationId: variation?.id,
    }))

  const characters = config.characters.map((character): OverviewEntry => {
    const owner = { kind: 'character', id: character.id } as const
    const characterState = state.characters[character.id]
    const entry: OverviewEntry = {
      owner,
      ownerLabel: labelsById.get(character.id) ?? character.id,
      scales: config.scales
        .filter((scale) => scale.characterId === character.id)
        .flatMap((scale) => {
          const value = characterState?.scales[scale.key]

          return value === undefined ? [] : [{ key: scale.key, label: scale.label, min: scale.min, max: scale.max, value }]
        }),
      resources: resourceList(characterState?.resources ?? {}),
      variants: variantsOf(owner),
    }

    const householdId = characterState?.householdId
    const household = householdId === undefined ? undefined : state.households[householdId]
    if (householdId !== undefined && household) {
      const partnerIds = household.memberIds.filter((memberId) => memberId !== character.id)
      entry.household = {
        householdId,
        partnerIds,
        partnerLabels: partnerIds.map((memberId) => labelsById.get(memberId) ?? memberId),
        resources: resourceList(household.resources),
      }
    }

    return entry
  })

  const groups = config.groups.map((group): OverviewEntry => {
    const owner = { kind: 'group', id: group.id } as const

    return { owner, ownerLabel: group.name, scales: [], resources: [], variants: variantsOf(owner) }
  })

  return { chapter, characters, groups }
}
