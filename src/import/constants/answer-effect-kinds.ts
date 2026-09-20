import type { effectKind } from '@/db/schema'
import type { AnswerEffectName } from './sheet-vocabulary'

type EffectKind = (typeof effectKind.enumValues)[number]

/** Sheet effect names to the stored effect kind (§4.5, layer 2). */
export const ANSWER_EFFECT_KINDS: Readonly<Record<AnswerEffectName, EffectKind>> = Object.freeze({
  HOUSEHOLD_CREATE: 'domacnost_vznik',
  HOUSEHOLD_DELETE: 'domacnost_zanik',
})
