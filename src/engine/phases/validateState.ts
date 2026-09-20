/**
 * The incoming state must match the config: every character with every scale
 * and personal account it was given, every household a real pair whose members
 * point back at it, every stored variant one of the owner's blocks for the
 * chapter being computed. A mismatch is a bug in whoever saved the snapshot,
 * and the engine names it rather than filling anything in.
 */
import type { Catalog } from '../catalog/buildCatalog'
import { failIfAny, type EngineProblem } from '../errors/engineInputError'
import type { BlockId, ChapterNumber, VariationId } from '../types/ids'
import type { RunState } from '../types/state'
import { splitHouseholdId } from '../utils/splitHouseholdId'

type Report = (subject: string, detail: string) => void

/**
 * The selection decides the questionnaire (§4.5), so a stray ID is not
 * harmless: it would ask, or skip, a question nobody chose to.
 */
const checkSelectedVariants = (state: RunState, catalog: Catalog, chapter: ChapterNumber, report: Report): void => {
  const decidedBlocks = new Set<BlockId>()
  const checkOwner = (ownerKind: 'character' | 'group', ownerId: string, variationIds: VariationId[]): void => {
    for (const variationId of variationIds) {
      const block = catalog.variations.get(variationId)?.block
      if (!block) {
        report(variationId, 'selected variant is not in the config')
        continue
      }
      if (block.chapter !== chapter) report(variationId, `selected for chapter ${chapter}, but its block belongs to chapter ${block.chapter}`)
      if ((ownerKind === 'character' ? block.characterId : block.groupId) !== ownerId) {
        report(variationId, `stored under ${ownerKind} ${ownerId}, who does not own block ${block.id}`)
      }
      if (decidedBlocks.has(block.id)) report(block.id, 'has two selected variants; a block returns one (§8.2)')
      decidedBlocks.add(block.id)
    }
  }

  for (const [characterId, variationIds] of Object.entries(state.selectedVariants.characters)) {
    checkOwner('character', characterId, variationIds)
  }
  for (const [groupId, variationIds] of Object.entries(state.selectedVariants.groups)) {
    checkOwner('group', groupId, variationIds)
  }

  // A draft with an undecided block must not be built on: whether the question
  // was asked is unknown, and "not asked" would be a guess.
  for (const question of catalog.config.questions) {
    if (question.chapter !== chapter || question.conditionVariationId === undefined) continue
    const block = catalog.variations.get(question.conditionVariationId)?.block
    if (block && !decidedBlocks.has(block.id)) {
      report(question.id, `block ${block.id} has no selected variant, so the questionnaire cannot be decided`)
    }
  }
}

export const validateState = (state: RunState, catalog: Catalog, chapter: ChapterNumber): void => {
  const problems: EngineProblem[] = []
  const report: Report = (subject, detail) => {
    problems.push({ code: 'inconsistent_state', subject, detail })
  }

  if (state.completedChapter !== chapter - 1) {
    problems.push({
      code: 'chapter_mismatch',
      subject: String(chapter),
      detail: `the state is after chapter ${state.completedChapter}, not ${chapter - 1}`,
    })
  }

  for (const characterId of catalog.characterIds) {
    const character = state.characters[characterId]
    if (!character) {
      report(characterId, 'character is missing from the state')
      continue
    }
    for (const scale of catalog.config.scales) {
      if (scale.characterId !== characterId) continue
      const value = character.scales[scale.key]
      if (value === undefined) report(scale.externalId, 'no value in the state')
      else if (value < scale.min || value > scale.max) report(scale.externalId, `${value} is outside ${scale.min}–${scale.max}`)
    }
    for (const resource of catalog.config.resources) {
      if (resource.owner.kind !== 'character' || resource.owner.characterId !== characterId) continue
      if (character.resources[resource.key] === undefined) report(resource.externalId, 'no value in the state')
    }
    if (character.householdId !== undefined && !state.households[character.householdId]) {
      report(characterId, `points at household ${character.householdId}, which is not in the state`)
    }
  }

  for (const [householdId, household] of Object.entries(state.households)) {
    const members = splitHouseholdId(householdId, catalog.characterIds)
    if (!members) {
      report(householdId, 'is not a pair of characters in alphabetical order')
      continue
    }
    for (const memberId of members) {
      if (!household.memberIds.includes(memberId)) report(householdId, `member ${memberId} is not listed`)
      if (state.characters[memberId]?.householdId !== householdId) report(householdId, `${memberId} does not point back at it`)
    }
  }

  checkSelectedVariants(state, catalog, chapter, report)

  failIfAny(problems)
}
