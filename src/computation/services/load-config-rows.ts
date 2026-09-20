import type { RunScope } from '@/db'
import {
  answerOptions,
  blockVariations,
  chapters,
  characterResources,
  characterScales,
  characters,
  contentBlocks,
  groups,
  householdResources,
  households,
  questions,
  resources,
  scales,
} from '@/db/schema'
import type { ConfigRows } from '../types/config-rows'

/** The whole config of a run is a few hundred rows (23 characters), so it is simply read whole. */
export const loadConfigRows = async (scope: RunScope): Promise<ConfigRows> => ({
  chapters: await scope.selectColumns(chapters, { id: chapters.id, number: chapters.number }),
  characters: await scope.selectColumns(characters, {
    id: characters.id,
    externalId: characters.externalId,
    defaultHouseholdId: characters.defaultHouseholdId,
  }),
  groups: await scope.selectColumns(groups, { id: groups.id, externalId: groups.externalId }),
  households: await scope.selectColumns(households, { id: households.id, externalId: households.externalId }),
  scales: await scope.selectColumns(scales, { id: scales.id, key: scales.key, label: scales.label }),
  resources: await scope.selectColumns(resources, {
    id: resources.id,
    key: resources.key,
    label: resources.label,
    scope: resources.scope,
  }),
  characterScales: await scope.selectColumns(characterScales, {
    characterId: characterScales.characterId,
    scaleId: characterScales.scaleId,
    externalId: characterScales.externalId,
    minValue: characterScales.minValue,
    maxValue: characterScales.maxValue,
    defaultValue: characterScales.defaultValue,
  }),
  characterResources: await scope.selectColumns(characterResources, {
    characterId: characterResources.characterId,
    resourceId: characterResources.resourceId,
    defaultValue: characterResources.defaultValue,
  }),
  householdResources: await scope.selectColumns(householdResources, {
    householdId: householdResources.householdId,
    resourceId: householdResources.resourceId,
    defaultValue: householdResources.defaultValue,
  }),
  questions: await scope.selectColumns(questions, {
    id: questions.id,
    externalId: questions.externalId,
    chapterId: questions.chapterId,
    characterId: questions.characterId,
    ordinal: questions.ordinal,
    type: questions.type,
    conditionVariationId: questions.conditionVariationId,
  }),
  answerOptions: await scope.selectColumns(answerOptions, {
    id: answerOptions.id,
    externalId: answerOptions.externalId,
    questionId: answerOptions.questionId,
    ordinal: answerOptions.ordinal,
    label: answerOptions.label,
  }),
  contentBlocks: await scope.selectColumns(contentBlocks, {
    id: contentBlocks.id,
    externalId: contentBlocks.externalId,
    characterId: contentBlocks.characterId,
    groupId: contentBlocks.groupId,
  }),
  blockVariations: await scope.selectColumns(blockVariations, {
    id: blockVariations.id,
    externalId: blockVariations.externalId,
    blockId: blockVariations.blockId,
  }),
})
