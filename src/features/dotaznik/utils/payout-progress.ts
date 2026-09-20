import type { OptionView } from '@/computation'
import type { PayoutProgress } from '../types/payout-progress'
import { parseWholeNumber } from './parse-whole-number'

/**
 * Running total of a dissolution's inputs against the joint balance. Nothing is
 * derived for the org — no remainder, no halves; an empty field adds nothing
 * and keeps the split from matching.
 */
export const payoutProgress = (
  option: OptionView,
  inputTexts: Record<string, string> | undefined,
): PayoutProgress | undefined => {
  const effect = option.householdEffect
  if (effect?.kind !== 'household_dissolve' || effect.jointBalance === undefined) return undefined

  let distributed = 0
  let allEntered = true
  for (const field of option.inputs) {
    const number = parseWholeNumber(inputTexts?.[field.key] ?? '', false)
    if (number._type === 'valid') distributed += number.value
    else allEntered = false
  }

  return { distributed, balance: effect.jointBalance, matches: allEntered && distributed === effect.jointBalance }
}
