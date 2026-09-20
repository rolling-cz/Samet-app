import type {
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

/**
 * The config as the database holds it, narrowed to what the computation core
 * reads. The engine's own config comes from the archived workbook; these rows
 * are what ties its IDs to database keys, plus what the UI reads state from.
 */
export interface ConfigRows {
  chapters: Pick<typeof chapters.$inferSelect, 'id' | 'number'>[]
  characters: Pick<typeof characters.$inferSelect, 'id' | 'externalId' | 'defaultHouseholdId'>[]
  groups: Pick<typeof groups.$inferSelect, 'id' | 'externalId'>[]
  households: Pick<typeof households.$inferSelect, 'id' | 'externalId'>[]
  scales: Pick<typeof scales.$inferSelect, 'id' | 'key' | 'label'>[]
  resources: Pick<typeof resources.$inferSelect, 'id' | 'key' | 'label' | 'scope'>[]
  characterScales: Pick<
    typeof characterScales.$inferSelect,
    'characterId' | 'scaleId' | 'externalId' | 'minValue' | 'maxValue' | 'defaultValue'
  >[]
  characterResources: Pick<typeof characterResources.$inferSelect, 'characterId' | 'resourceId' | 'defaultValue'>[]
  householdResources: Pick<typeof householdResources.$inferSelect, 'householdId' | 'resourceId' | 'defaultValue'>[]
  questions: Pick<
    typeof questions.$inferSelect,
    'id' | 'externalId' | 'chapterId' | 'characterId' | 'ordinal' | 'type' | 'conditionVariationId'
  >[]
  answerOptions: Pick<typeof answerOptions.$inferSelect, 'id' | 'externalId' | 'questionId' | 'ordinal' | 'label'>[]
  contentBlocks: Pick<typeof contentBlocks.$inferSelect, 'id' | 'externalId' | 'characterId' | 'groupId'>[]
  blockVariations: Pick<typeof blockVariations.$inferSelect, 'id' | 'externalId' | 'blockId'>[]
}
