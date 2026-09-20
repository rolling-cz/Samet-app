/**
 * Impacts derived from a household effect (§4.4).
 *
 * The author writes `HOUSEHOLD_CREATE(Marie, Mirek)` and nothing else: the
 * transfer between the personal accounts and the joint one follows from the
 * effect, so they never write the same two lines for every marriage. How much
 * each member moves is still a number the org types in — `{input1}` for the
 * first character of the effect, `{input2}` for the second — because nothing
 * here halves a balance or guesses a split.
 *
 * A pure function with tests for the same reason as `scale-impact.ts`: it is
 * small, it decides real numbers, and its mistakes surface as wrong balances in
 * a printed document.
 */
import { householdExternalId } from '@/engine'
import {
  HOUSEHOLD_INPUT_KEYS,
  HOUSEHOLD_TRANSFER_RESOURCE_KEY,
} from './constants/household-effects'
import type { ImpactTerm, ScaleImpact } from './scale-impact'
import type { ParsedAnswerEffect } from './types/parsed-question'

const impact = (
  owner: string,
  forcedPrivate: boolean,
  terms: ImpactTerm[],
  effect: ParsedAnswerEffect,
): ScaleImpact => ({
  externalId: `R_${owner}_${HOUSEHOLD_TRANSFER_RESOURCE_KEY}`,
  kind: 'resource',
  owner,
  key: HOUSEHOLD_TRANSFER_RESOURCE_KEY,
  forcedPrivate,
  mode: 'shift',
  fromAnswer: false,
  terms,
  raw: effect.raw,
  derivedFrom: effect.raw,
})

/**
 * `HOUSEHOLD_CREATE` moves both personal accounts into the joint one,
 * `HOUSEHOLD_DISSOLVE` the other way round. Returns nothing when the effect does
 * not name two members — the validation reports that on its own.
 */
export const householdEffectImpacts = (effect: ParsedAnswerEffect): ScaleImpact[] => {
  const [first, second] = effect.args
  if (first === undefined || second === undefined) return []

  const [firstKey, secondKey] = HOUSEHOLD_INPUT_KEYS
  const joint = householdExternalId(first, second)
  // Both members pay into the joint account on creation and are paid out of it
  // on dissolution, so one pair of signs is the whole difference.
  const creating = effect.name === 'HOUSEHOLD_CREATE'
  const memberSign: 1 | -1 = creating ? -1 : 1
  const jointSign: 1 | -1 = creating ? 1 : -1

  return [
    impact(first, true, [{ sign: memberSign, inputKey: firstKey }], effect),
    impact(second, true, [{ sign: memberSign, inputKey: secondKey }], effect),
    impact(
      joint,
      false,
      [
        { sign: jointSign, inputKey: firstKey },
        { sign: jointSign, inputKey: secondKey },
      ],
      effect,
    ),
  ]
}
