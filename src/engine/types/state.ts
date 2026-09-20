/** Run state at the start of a chapter — the first argument of `evaluate` (§4.3). */
import type { CharacterId, GroupId, HouseholdId, ResourceKey, ScaleKey, VariationId } from './ids'

export interface CharacterState {
  scales: Record<ScaleKey, number>
  /** The personal account, which marriage never dissolves (§4.4). */
  resources: Record<ResourceKey, number>
  /**
   * Absent while the character is single: they are not a household of one, and
   * their money simply stays on the personal account (§4.4).
   */
  householdId?: HouseholdId
}

/** Owner of the joint account (§4.4). */
export interface HouseholdState {
  /** Both members, sorted — the same order the ID is built from. */
  memberIds: CharacterId[]
  resources: Record<ResourceKey, number>
}

/**
 * Variants chosen per owner, sorted (§4.3). They are state, not a by-product
 * of the documents: a question's `Condition` is looked up here (§4.5).
 *
 * Kept for the whole run, not per chapter: a variant's block says which
 * chapter it belongs to, so the IDs need no further grouping.
 */
export interface SelectedVariants {
  characters: Record<CharacterId, VariationId[]>
  groups: Record<GroupId, VariationId[]>
}

/**
 * Group membership and leadership are not here on purpose: they are not state
 * (§4.6) — block variants and their conditions say it.
 */
export interface RunState {
  /** Chapter already computed; `0` is the state the run starts from. */
  completedChapter: number
  characters: Record<CharacterId, CharacterState>
  households: Record<HouseholdId, HouseholdState>
  /**
   * Every selection made so far, up to chapter `completedChapter + 1` — whose
   * variants were chosen while `completedChapter` was computed, so they are
   * known before that questionnaire opens. Empty at the start of the run —
   * chapter 1 has no `1_Content`.
   *
   * The earlier chapters stay so that the engine knows which of their
   * questions were asked and can tell "not asked" from "answer not passed in".
   */
  selectedVariants: SelectedVariants
}
