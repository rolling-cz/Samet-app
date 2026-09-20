import type { RunScope } from '@/db'
import type { ParsedConfig } from '../types/parsed-config'
import { loadChapterIds } from './load-chapter-ids'
import { upsertBlocks } from './upsert-blocks'
import { upsertCharacters } from './upsert-characters'
import { upsertGroups } from './upsert-groups'
import { upsertHouseholds } from './upsert-households'
import { upsertQuestions } from './upsert-questions'
import { upsertResources } from './upsert-resources'
import { upsertScales } from './upsert-scales'
import { createWrittenRows, type WrittenRows } from './written-rows'

/** Upserts every entity of the config in foreign-key order and reports which rows it wrote. */
export const writeEntities = async (scope: RunScope, config: ParsedConfig): Promise<WrittenRows> => {
  const written = createWrittenRows()

  const chapterIds = await loadChapterIds(scope)

  const groupIds = await upsertGroups(scope, config, written)
  const householdIds = await upsertHouseholds(scope, config, written, chapterIds)
  const characterIds = await upsertCharacters(scope, config, written, householdIds)
  const scaleIds = await upsertScales(scope, config, written, characterIds)
  const resourceIds = await upsertResources(scope, config, written, characterIds, householdIds)

  const blockIds = await upsertBlocks(scope, config, written, characterIds, groupIds, chapterIds)

  await upsertQuestions(scope, config, written, {
    characterIds,
    groupIds,
    scaleIds,
    resourceIds,
    chapterIds,
    blockIds,
    questionIds: new Map(),
  })

  return written
}
