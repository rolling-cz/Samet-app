/** Structural effects of an answer — the `Effects` column (§4.4). */
import type { StructuralEffectKind } from '../constants/effectPhases'
import type { CharacterId } from './ids'

/**
 * `HOUSEHOLD_CREATE(Marie, Mirek)` / `HOUSEHOLD_DELETE(Marie, Mirek)`.
 *
 * Both members are named outright and the household's ID follows from them, so
 * an effect can name a household before it exists. The argument order decides
 * which member `{input1}` belongs to, but not the ID (§4.4).
 *
 * Group membership and leadership are deliberately absent: they are not state
 * (§4.6).
 */
export interface HouseholdEffect {
  kind: StructuralEffectKind
  members: [CharacterId, CharacterId]
  /** The cell text, for the trace and for matching the derived impacts. */
  raw: string
}
