import { compareIds, type RollInput } from '@/engine'
import { UnknownIdError } from '../errors/unknownIdError'
import type { RollRow } from '../types/answer-rows'
import type { IdDirectory } from '../types/id-directory'

export const compareRolls = (a: RollInput, b: RollInput): number =>
  compareIds(a.variationId, b.variationId) || a.occurrence - b.occurrence

/** The roll's owner is its variant's block's (§7.4); the row stores neither. */
export const rollsFromRows = (rows: readonly RollRow[], directory: IdDirectory): RollInput[] => {
  const rolls = rows.map((row): RollInput => {
    const placement = directory.placements.get(row.blockVariationId)
    if (!placement) throw new UnknownIdError('variation', row.blockVariationId, 'to_config')

    return {
      ownerKind: placement.owner.ownerKind,
      ownerId: placement.owner.ownerId,
      variationId: directory.variations.toExternal(row.blockVariationId),
      occurrence: row.occurrence,
      value: row.value,
    }
  })

  return rolls.sort(compareRolls)
}
