/**
 * The config tables as the import would fill them, built from an `EngineConfig`
 * — so the conversions can be tested on the fixture without a database.
 * Database keys are the workbook ID behind a prefix: distinct from the ID, and
 * readable when a test fails.
 */
import { CHAPTER_NUMBERS, type EngineConfig } from '@/engine'
import type { ConfigRows } from '../types/config-rows'

export const fakeDbId = (kind: string, externalId: string | number): string => `db:${kind}:${externalId}`

/** `extraHouseholdIds`: households founded in play, which the config itself does not list. */
export const fakeConfigRows = (config: EngineConfig, extraHouseholdIds: readonly string[] = []): ConfigRows => {
  const startingHouseholdIds = new Set<string>()
  for (const character of config.characters) {
    if (character.initialHouseholdId !== undefined) startingHouseholdIds.add(character.initialHouseholdId)
  }

  const scaleKeys = new Map(config.scales.map((scale) => [scale.key, scale.label]))
  const resourceKeys = new Map(config.resources.map((resource) => [resource.key, resource]))

  const rows: ConfigRows = {
    chapters: CHAPTER_NUMBERS.map((number) => ({ id: fakeDbId('chapter', number), number })),
    characters: config.characters.map((character) => ({
      id: fakeDbId('character', character.id),
      externalId: character.id,
      defaultHouseholdId:
        character.initialHouseholdId === undefined ? null : fakeDbId('household', character.initialHouseholdId),
    })),
    groups: config.groups.map((group) => ({ id: fakeDbId('group', group.id), externalId: group.id })),
    households: [...startingHouseholdIds, ...extraHouseholdIds].map((externalId) => ({
      id: fakeDbId('household', externalId),
      externalId,
    })),
    scales: [...scaleKeys].map(([key, label]) => ({ id: fakeDbId('scale', key), key, label })),
    resources: [...resourceKeys.values()].map((resource) => ({
      id: fakeDbId('resource', resource.key),
      key: resource.key,
      label: resource.label,
      scope: resource.scope,
    })),
    characterScales: config.scales.map((scale) => ({
      characterId: fakeDbId('character', scale.characterId),
      scaleId: fakeDbId('scale', scale.key),
      externalId: scale.externalId,
      minValue: scale.min,
      maxValue: scale.max,
      defaultValue: scale.defaultValue,
    })),
    characterResources: [],
    householdResources: [],
    questions: [],
    answerOptions: [],
    contentBlocks: config.blocks.map((block) => ({
      id: fakeDbId('block', block.id),
      externalId: block.id,
      characterId: block.characterId === undefined ? null : fakeDbId('character', block.characterId),
      groupId: block.groupId === undefined ? null : fakeDbId('group', block.groupId),
    })),
    blockVariations: config.blocks.flatMap((block) =>
      block.variations.map((variation) => ({
        id: fakeDbId('variation', variation.id),
        externalId: variation.id,
        blockId: fakeDbId('block', block.id),
      })),
    ),
  }

  for (const resource of config.resources) {
    if (resource.owner.kind === 'character') {
      rows.characterResources.push({
        characterId: fakeDbId('character', resource.owner.characterId),
        resourceId: fakeDbId('resource', resource.key),
        defaultValue: resource.defaultValue,
      })
      continue
    }
    rows.householdResources.push({
      householdId: fakeDbId('household', resource.owner.householdId),
      resourceId: fakeDbId('resource', resource.key),
      defaultValue: resource.defaultValue,
    })
  }

  for (const question of config.questions) {
    rows.questions.push({
      id: fakeDbId('question', question.id),
      externalId: question.id,
      chapterId: fakeDbId('chapter', question.chapter),
      characterId: question.characterId === undefined ? null : fakeDbId('character', question.characterId),
      ordinal: question.ordinal ?? null,
      type: question.type,
      conditionVariationId:
        question.conditionVariationId === undefined ? null : fakeDbId('variation', question.conditionVariationId),
    })
    for (const option of question.options) {
      rows.answerOptions.push({
        id: fakeDbId('option', option.id),
        externalId: option.id,
        questionId: fakeDbId('question', question.id),
        ordinal: option.ordinal,
        label: option.label,
      })
    }
  }

  return rows
}
