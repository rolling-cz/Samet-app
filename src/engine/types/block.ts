/** Document blocks and their variants from `N_Content` (§8.2). */
import type { BlockId, ChapterNumber, CharacterId, GroupId, VariationId } from './ids'

export interface VariationDefinition {
  id: VariationId
  /** Row order within the block, from 1 — the order when no priority is set. */
  ordinal: number
  /** Lower goes first; absent when the author left the cell empty (§8.2). */
  priority?: number
  /** The author's expression (§4.5); `DEFAULT` and an empty cell are the same. */
  condition: string
  /** May be empty — the "nothing happened" variant (§8.2). */
  text: string
}

/**
 * A block belongs to a character or to a group, and lives in the chapter whose
 * documents it is printed into (`2_Content` → chapter 2). Its variants are
 * chosen when the previous chapter is computed (§8.2, see `NEXT_CHAPTER_OFFSET`).
 */
export interface BlockDefinition {
  id: BlockId
  chapter: ChapterNumber
  characterId?: CharacterId
  groupId?: GroupId
  variations: VariationDefinition[]
}
