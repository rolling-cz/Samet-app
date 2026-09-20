import type { RollOwner } from '@/engine'
import type { IdLookup } from './id-lookup'

/** Whose block a variant belongs to — what a roll and a selection are filed under. */
export interface VariationPlacement {
  /** Database key of the block. */
  blockId: string
  owner: RollOwner
}

/**
 * The one place database keys and workbook IDs meet. The engine speaks
 * `Marie` and `Q_Marie_1_1`, the database speaks UUIDs.
 */
export interface IdDirectory {
  chapters: IdLookup<number>
  characters: IdLookup
  groups: IdLookup
  households: IdLookup
  /** By scale key (`Regime`), which is how the state names a scale. */
  scales: IdLookup
  /** By resource key (`Wealth`). */
  resources: IdLookup
  questions: IdLookup
  answerOptions: IdLookup
  blocks: IdLookup
  variations: IdLookup
  /** By the variant's database key. */
  placements: ReadonlyMap<string, VariationPlacement>
}
