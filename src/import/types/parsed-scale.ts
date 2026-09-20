import type { Sourced } from './sourced'

/**
 * One row of the `Scales` sheet: a character, a scale and the range it runs on
 * (§4.2).
 *
 * `Min` and `Max` belong to the pair, not to the scale — two characters may
 * track the same scale on different ranges — so there is no separate parsed
 * scale definition beyond the distinct keys these rows mention.
 */
export interface ParsedScaleRow extends Sourced {
  /** `S_<Postava>_<Skala>`, assembled from the two columns. */
  externalId: string
  /** What the author typed in the `Character` column. */
  characterRef: string
  /** Registry ID it resolved to; undefined when nothing matched. */
  characterId?: string
  key: string
  label: string
  min: number
  max: number
  /** Starting value for chapter 1. */
  defaultValue: number
}
