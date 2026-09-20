/**
 * A computation's state as the snapshot tables hold it, in database keys. The
 * same shape is written after a computation and read back before the next
 * chapter; `run_id`, `chapter_id` and `computation_id` are the shell's to add.
 */
export interface ScaleValueRow {
  characterId: string
  scaleId: string
  value: number
  /** Value before clamping; set exactly when `wasClamped` is. */
  rawValue: number | null
  wasClamped: boolean
}

export interface ResourceValueRow {
  characterId: string
  resourceId: string
  value: number
}

export interface MembershipRow {
  characterId: string
  householdId: string
}

export interface HouseholdResourceValueRow {
  householdId: string
  resourceId: string
  value: number
}

export interface SelectedVariationRow {
  blockId: string
  blockVariationId: string
}

export interface SnapshotRows {
  scaleValues: ScaleValueRow[]
  resourceValues: ResourceValueRow[]
  memberships: MembershipRow[]
  householdResourceValues: HouseholdResourceValueRow[]
  /** The whole run's selection so far, not just this chapter's — see `stateToSnapshot`. */
  selectedVariations: SelectedVariationRow[]
}
