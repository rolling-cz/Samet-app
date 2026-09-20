import type { ParsedBlock, ParsedVariation } from '../types/parsed-block'

/**
 * The order a block's variants are evaluated in (§8.2).
 *
 * Ascending `Priority` when the block uses priorities, row order when it does
 * not. Both are legitimate; a block that mixes them is ambiguous and reported
 * by `checkContent`.
 */
export const variationOrder = (block: ParsedBlock): ParsedVariation[] => {
  const ordered = [...block.variations]
  if (!usesPriorities(block)) return ordered.sort((a, b) => a.ordinal - b.ordinal)

  return ordered.sort((a, b) => {
    const left = a.priority ?? Number.MAX_SAFE_INTEGER
    const right = b.priority ?? Number.MAX_SAFE_INTEGER
    if (left !== right) return left - right

    return a.ordinal - b.ordinal
  })
}

/** True when any variant carries a priority; a block is all-or-nothing (§11, 6h). */
export const usesPriorities = (block: ParsedBlock): boolean =>
  block.variations.some((variation) => variation.priority !== undefined)
