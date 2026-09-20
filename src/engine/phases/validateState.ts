/**
 * The incoming state must match the config: every character with every scale
 * and personal account it was given, every household a real pair whose members
 * point back at it. A mismatch is a bug in whoever saved the snapshot, and the
 * engine names it rather than filling anything in.
 */
import type { Catalog } from '../catalog/buildCatalog'
import { failIfAny, type EngineProblem } from '../errors/engineInputError'
import type { ChapterNumber } from '../types/ids'
import type { RunState } from '../types/state'
import { splitHouseholdId } from '../utils/splitHouseholdId'

export const validateState = (state: RunState, catalog: Catalog, chapter: ChapterNumber): void => {
  const problems: EngineProblem[] = []
  const report = (subject: string, detail: string): void => {
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

  failIfAny(problems)
}
