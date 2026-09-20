/** Run state at the start of a chapter — the first argument of `evaluate` (§4.3). */
import type { CharacterId, HouseholdId, ResourceKey, ScaleKey } from './ids'

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
 * Groups are not here on purpose: who belongs to one and who leads it is not
 * state (§4.6) — block variants and their conditions say it.
 */
export interface RunState {
  /** Chapter already computed; `0` is the state the run starts from. */
  completedChapter: number
  characters: Record<CharacterId, CharacterState>
  households: Record<HouseholdId, HouseholdState>
}
