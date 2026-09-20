import type { ParsedBlock } from '../types/parsed-block'

/** `Variation ID` → the block it belongs to, for one chapter's `N_Content`. */
export const variationBlocks = (blocks: ParsedBlock[]): Map<string, ParsedBlock> => {
  const index = new Map<string, ParsedBlock>()
  for (const block of blocks) {
    for (const variation of block.variations) index.set(variation.externalId, block)
  }

  return index
}
