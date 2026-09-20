/**
 * The signed number an impact moves or sets, or `undefined` when the org has
 * not supplied every `{input}` (or the `=VALUE` number) yet. Nothing is
 * guessed, halved or defaulted (§4.4).
 */
import type { ImpactInstance } from './collectEffects'

export const impactAmount = (instance: ImpactInstance): number | undefined => {
  if (instance.impact.fromAnswer) return instance.answerValue

  let total = 0
  for (const term of instance.impact.terms) {
    if (term.literal !== undefined) {
      total += term.sign * term.literal
      continue
    }
    const value = term.inputKey === undefined ? undefined : instance.inputs[term.inputKey]
    if (value === undefined) return undefined
    total += term.sign * value
  }

  return total
}

/** Placeholders the org has not filled in, for the conflict message. */
export const missingInputKeys = (instance: ImpactInstance): string[] => {
  const keys: string[] = []
  for (const term of instance.impact.terms) {
    if (term.inputKey !== undefined && instance.inputs[term.inputKey] === undefined) keys.push(term.inputKey)
  }

  return keys
}
