/**
 * Phase membership lives in data so an `evaluate` implementation cannot work
 * around it — the phase order is an invariant, not a detail (§7.3).
 */

/**
 * Effects of the structural phase, in the order they are applied; all of them
 * must be applied before any value effect (§7.3).
 *
 * Every dissolution goes first: a divorce and a new marriage in the same
 * chapter must not leave a character in two households, and applying them the
 * other way round would.
 */
export const STRUCTURAL_EFFECT_KINDS = Object.freeze([
  'domacnost_zanik',
  'domacnost_vznik',
] as const)

/** Effects of the value phase; absolute settings (`nastaveni_skaly`) go first. */
export const VALUE_EFFECT_KINDS = Object.freeze([
  'nastaveni_skaly',
  'zmena_skaly',
  'pasmo',
  'priznak',
  'blok',
  'tag',
] as const)

export type StructuralEffectKind = (typeof STRUCTURAL_EFFECT_KINDS)[number]
export type ValueEffectKind = (typeof VALUE_EFFECT_KINDS)[number]
