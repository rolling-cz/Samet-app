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
import type {
  BiographyEntry,
  BlockDefinition,
  ChapterNumber,
  EngineConfig,
  SelectedVariants,
  VariationDefinition,
} from '@/engine'
// The module, not the `@/import` barrel, which would open a database connection.
import { isBiographyOnly } from '@/import/template'
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
  biography: BlockBiography
}

/** What `{ZIVOTOPIS}` is filled from (§8.2). */
export interface BlockBiography {
  /** Block ID → entries of the chosen variant; blocks without any are absent. */
  entries: Map<string, BiographyEntry[]>
  /** Blocks that count without a marker, because they exist only for the biography. */
  biographyOnly: Set<string>
}

export const blockTextsFor = (
  config: EngineConfig,
  selected: SelectedVariants,
  owner: DocumentOwner,
  chapter: ChapterNumber,
): BlockTexts => {
  const texts = new Map<string, string>()
  const undecided: string[] = []
  const biography: BlockBiography = { entries: new Map(), biographyOnly: new Set() }

  for (const { block, variation } of ownerBlocks(config, selected, owner, chapter)) {
    if (isBiographyOnly(block)) biography.biographyOnly.add(block.id)
    if (variation === undefined) {
      undecided.push(block.id)
      continue
    }
    texts.set(block.id, variation.text)
    if (variation.biography?.length) biography.entries.set(block.id, variation.biography)
  }

  return { texts, undecided, biography }
}
