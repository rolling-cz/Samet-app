import type { effectKind } from '@/db/schema'

type EffectKind = (typeof effectKind.enumValues)[number]

/** Sheet effect names (`SNATEK(Mirek)`) to the stored effect kind (§4.5, layer 2). */
export const ANSWER_EFFECT_KINDS: Readonly<Record<string, EffectKind>> = Object.freeze({
  SNATEK: 'domacnost_slouceni',
  ROZVOD: 'domacnost_rozdeleni',
  VEDENI: 'vedeni',
  CLENSTVI: 'clenstvi',
})
