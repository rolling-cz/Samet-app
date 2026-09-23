/**
 * The text each of an owner's blocks contributes to the chapter's document
 * (§8.2).
 *
 * Built from two things the caller already has: the config (which carries every
 * variant's text, read back from the archived `.xlsx`) and the run state (which
 * carries the variant IDs the computation chose). Nothing is read from
 * `selected_variations` again and no condition is evaluated a second time — the
 * engine decided this when the previous chapter was computed.
 */
import type { BlockDefinition, ChapterNumber, EngineConfig, SelectedVariants, VariationDefinition } from '@/engine'
import type { DocumentOwner } from '../types/document'

/** One of an owner's blocks in a chapter, with the variant the computation chose — absent while a roll is missing. */
export interface OwnerBlock {
  block: BlockDefinition
  variation?: VariationDefinition
}

/** The owner's blocks of the chapter, in sheet order; shared by the document and the Přehled tab. */
export const ownerBlocks = (
  config: EngineConfig,
  selected: SelectedVariants,
  owner: DocumentOwner,
  chapter: ChapterNumber,
): OwnerBlock[] => {
  const chosen = new Set(owner.kind === 'character' ? (selected.characters[owner.id] ?? []) : (selected.groups[owner.id] ?? []))

  return config.blocks
    .filter((block) => block.chapter === chapter && (owner.kind === 'character' ? block.characterId : block.groupId) === owner.id)
    .map((block) => ({ block, variation: block.variations.find((candidate) => chosen.has(candidate.id)) }))
}

export interface BlockTexts {
  /** Block ID → text of the chosen variant; an empty string is a valid text. */
  texts: Map<string, string>
  /** Blocks of this owner and chapter with no variant chosen — a missing roll (§7.4). */
  undecided: string[]
}

export const blockTextsFor = (
  config: EngineConfig,
  selected: SelectedVariants,
  owner: DocumentOwner,
  chapter: ChapterNumber,
): BlockTexts => {
  const texts = new Map<string, string>()
  const undecided: string[] = []

  for (const { block, variation } of ownerBlocks(config, selected, owner, chapter)) {
    if (variation === undefined) undecided.push(block.id)
    else texts.set(block.id, variation.text)
  }

  return { texts, undecided }
}
