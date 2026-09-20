import type { RollOwner } from '@/engine'
import { UnknownIdError } from '../errors/unknownIdError'
import type { ConfigRows } from '../types/config-rows'
import type { IdDirectory, VariationPlacement } from '../types/id-directory'
import { IdLookup } from '../types/id-lookup'

const ownerOf = (block: ConfigRows['contentBlocks'][number], characters: IdLookup, groups: IdLookup): RollOwner => {
  if (block.characterId !== null) return { ownerKind: 'character', ownerId: characters.toExternal(block.characterId) }
  if (block.groupId !== null) return { ownerKind: 'group', ownerId: groups.toExternal(block.groupId) }

  // `content_blocks_exactly_one_owner` rules this out in the database.
  throw new UnknownIdError('block owner', block.externalId, 'to_config')
}

const placementsOf = (
  rows: ConfigRows,
  characters: IdLookup,
  groups: IdLookup,
): Map<string, VariationPlacement> => {
  const blocks = new Map(rows.contentBlocks.map((block) => [block.id, block]))
  const placements = new Map<string, VariationPlacement>()

  for (const variation of rows.blockVariations) {
    const block = blocks.get(variation.blockId)
    if (!block) throw new UnknownIdError('block', variation.blockId, 'to_config')

    placements.set(variation.id, { blockId: block.id, owner: ownerOf(block, characters, groups) })
  }

  return placements
}

export const buildIdDirectory = (rows: ConfigRows): IdDirectory => {
  const characters = new IdLookup('character', rows.characters)
  const groups = new IdLookup('group', rows.groups)

  return {
    chapters: new IdLookup('chapter', rows.chapters.map((chapter) => ({ id: chapter.id, externalId: chapter.number }))),
    characters,
    groups,
    households: new IdLookup('household', rows.households),
    scales: new IdLookup('scale', rows.scales.map((scale) => ({ id: scale.id, externalId: scale.key }))),
    resources: new IdLookup('resource', rows.resources.map((resource) => ({ id: resource.id, externalId: resource.key }))),
    questions: new IdLookup('question', rows.questions),
    answerOptions: new IdLookup('answer option', rows.answerOptions),
    blocks: new IdLookup('block', rows.contentBlocks),
    variations: new IdLookup('variation', rows.blockVariations),
    placements: placementsOf(rows, characters, groups),
  }
}
