import type { RunScope } from '@/db'
import { blockVariations, contentBlocks } from '@/db/schema'
import type { ParsedConfig } from '../types/parsed-config'
import type { IdMap } from './entity-ids'
import type { WrittenRows } from './written-rows'

/** Blocks and their variants (layer 3, §8.2). */
export const upsertBlocks = async (
  scope: RunScope,
  config: ParsedConfig,
  written: WrittenRows,
  characterIds: IdMap,
  groupIds: IdMap,
  chapterIds: IdMap<number>,
): Promise<IdMap> => {
  const blockIds: IdMap = new Map()

  for (const [chapter, blocks] of config.blocks) {
    const chapterId = chapterIds.get(chapter)
    if (!chapterId) continue

    for (const block of blocks) {
      const characterId = block.characterId ? (characterIds.get(block.characterId) ?? null) : null
      const groupId = block.groupId ? (groupIds.get(block.groupId) ?? null) : null
      // A block belongs to a character or a group; the validation has already
      // reported the case where it resolved to neither.
      if (characterId === null && groupId === null) continue

      const values = { chapterId, characterId, groupId }
      const [row] = await scope
        .insert(contentBlocks, { externalId: block.externalId, ...values })
        .onConflictDoUpdate({
          target: [contentBlocks.runId, contentBlocks.externalId],
          set: values,
        })
        .returning({ id: contentBlocks.id })
      if (!row) continue

      written.contentBlocks.add(row.id)
      blockIds.set(block.externalId, row.id)
    }
  }

  for (const blocks of config.blocks.values()) {
    for (const block of blocks) {
      const blockId = blockIds.get(block.externalId)
      if (!blockId) continue

      for (const variation of block.variations) {
        const values = {
          blockId,
          ordinal: variation.ordinal,
          // NULL means the block orders by rows (§8.2).
          priority: variation.priority ?? null,
          description: variation.description || null,
          text: variation.text,
          conditionExpr: variation.condition.raw,
          conditionRefs: variation.condition.references,
        }
        const [row] = await scope
          .insert(blockVariations, { externalId: variation.externalId, ...values })
          .onConflictDoUpdate({
            target: [blockVariations.runId, blockVariations.externalId],
            set: values,
          })
          .returning({ id: blockVariations.id })
        if (row) written.blockVariations.add(row.id)
      }
    }
  }

  return blockIds
}
