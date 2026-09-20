/** Run state at the start of a chapter — the first argument of `evaluate`. */
import type { BandId, ChapterNumber, CharacterId, FlagId, HouseholdId, ScaleId } from './ids'

export interface CharacterState {
  characterId: CharacterId
  /** `postava`-scoped values only; shared ones live in `HouseholdState` (§4.4). */
  scales: Record<ScaleId, number>
  /** Derived from the value; kept for outputs and conditions. */
  bands: Record<ScaleId, BandId>
  flags: Record<FlagId, boolean>
  /**
   * Absent while the character is single: they are not a household of one, and
   * their money simply stays on the personal account (§4.4).
   */
  householdId?: HouseholdId
  /** Template variables: `{PRIJMENI}`, `{VEK}`, … (§8.8). */
  variables: Record<string, string>
}

/** Owner of shared values (§4.4). */
export interface HouseholdState {
  householdId: HouseholdId
  memberIds: CharacterId[]
  scales: Record<ScaleId, number>
  bands: Record<ScaleId, BandId>
}

/**
 * Groups are not here on purpose: who belongs to one and who leads it is not
 * state (§4.6) — block variants and their conditions say it.
 */
export interface RunState {
  runId: string
  chapter: ChapterNumber
  characters: Record<CharacterId, CharacterState>
  households: Record<HouseholdId, HouseholdState>
}
