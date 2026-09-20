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

/**
 * Effects of the value phase, in the order they are applied. Absolute settings
 * from org questions come first, so a shift in the same chapter moves the value
 * the org typed in and not last chapter's (§6.7).
 */
export const VALUE_EFFECT_KINDS = Object.freeze([
  'nastaveni_skaly',
  'nastaveni_zdroje',
  'zmena_skaly',
  'zmena_zdroje',
] as const)

export type StructuralEffectKind = (typeof STRUCTURAL_EFFECT_KINDS)[number]
export type ValueEffectKind = (typeof VALUE_EFFECT_KINDS)[number]
