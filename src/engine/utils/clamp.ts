import type { ScaleDefinition } from '../types/scale'

export interface ClampOutcome {
  value: number
  /** Set when the raw value left the range. */
  bound?: 'min' | 'max'
}

/** Clamped to the pair's own range, never wrapped (§4.1). */
export const clampToScale = (scale: ScaleDefinition, raw: number): ClampOutcome => {
  if (raw < scale.min) return { value: scale.min, bound: 'min' }
  if (raw > scale.max) return { value: scale.max, bound: 'max' }

  return { value: raw }
}
