/** Scale definitions (§4.1) — one per pair of character × scale. */
import type { CharacterId, ScaleKey } from './ids'

/**
 * `Min` and `Max` belong to the pair, never to the scale: two characters may
 * track `Regime` on different ranges, so nothing in the engine may assume 1–10.
 */
export interface ScaleDefinition {
  /** `S_Marie_Regime`, as the author writes it in a condition or an impact. */
  externalId: string
  characterId: CharacterId
  key: ScaleKey
  label: string
  min: number
  max: number
  /** Starting value for chapter 1; later chapters start from the snapshot. */
  defaultValue: number
}
