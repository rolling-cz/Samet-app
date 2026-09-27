import type { ExpressionParse } from '../expression'
import type { Sourced } from './sourced'

/** One line of the biography a variant contributes to `{ZIVOTOPIS}` (§8.2). */
export interface ParsedBiographyEntry extends Sourced {
  year: number
  /** Markdown; may hold variables, never `{BLOK}` or `{ZIVOTOPIS}`. */
  text: string
  /** Sheet row — entries of the same year print in row order. */
  row: number
}

export interface ParsedVariation extends Sourced {
  externalId: string
  /** Row order within the block, from 1 — the order when no priority is set. */
  ordinal: number
  /** `Priority` from the sheet; undefined when the cell is empty (§8.2). */
  priority?: number
  description: string
  text: string
  /** Blocks this variant's text nests inside itself (§8.4). */
  nestedBlocks: string[]
  /** An empty cell and `DEFAULT` both parse to the always-true fallback. */
  condition: ExpressionParse
  /** True for the fallback: empty condition or `DEFAULT`. */
  isFallback: boolean
  /** From the variant's own row and the continuation rows under it. */
  biography: ParsedBiographyEntry[]
}

export interface ParsedBlock extends Sourced {
  externalId: string
  chapter: number
  /** What the author typed in `Character`: a character or a group (§8.2). */
  ownerRef: string
  /** Registry ID it resolved to; undefined when nothing matched. */
  characterId?: string
  groupId?: string
  variations: ParsedVariation[]
}
