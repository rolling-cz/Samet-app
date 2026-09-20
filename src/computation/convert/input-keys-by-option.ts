import type { QuestionnaireRows } from '../types/questionnaire-rows'

type Ordered = { ordinal: number }

const byOrdinal = (a: Ordered, b: Ordered): number => a.ordinal - b.ordinal

/**
 * The `{input}` fields each option raises, by the option's database key. The
 * same name is one field however many impacts read it (§4.4), in the order the
 * effects name it first.
 */
export const inputKeysByOption = (
  rows: Pick<QuestionnaireRows, 'effects' | 'effectInputs'>,
): Map<string, string[]> => {
  const inputsByEffect = new Map<string, QuestionnaireRows['effectInputs']>()
  for (const input of rows.effectInputs) {
    const inputs = inputsByEffect.get(input.effectId) ?? []
    inputs.push(input)
    inputsByEffect.set(input.effectId, inputs)
  }

  const keysByOption = new Map<string, string[]>()
  for (const effect of [...rows.effects].sort(byOrdinal)) {
    for (const input of [...(inputsByEffect.get(effect.id) ?? [])].sort(byOrdinal)) {
      const keys = keysByOption.get(effect.answerOptionId) ?? []
      if (!keys.includes(input.inputKey)) keys.push(input.inputKey)
      keysByOption.set(effect.answerOptionId, keys)
    }
  }

  return keysByOption
}
