/** Stored rolls by key, checked to be whole numbers inside 1–100 (§7.4). */
import { ROLL_MAX, ROLL_MIN } from '../constants/expressionLanguage'
import { failIfAny, type EngineProblem } from '../errors/engineInputError'
import type { RollInput } from '../types/input'
import { rollKey } from '../utils/keys'

export const indexRolls = (rolls: RollInput[]): Map<string, number> => {
  const problems: EngineProblem[] = []
  const index = new Map<string, number>()

  for (const roll of rolls) {
    const key = rollKey(roll, roll.variationId, roll.occurrence)
    const subject = `${roll.ownerId}/${roll.variationId}/${roll.occurrence}`
    if (!Number.isInteger(roll.value) || roll.value < ROLL_MIN || roll.value > ROLL_MAX) {
      problems.push({ code: 'invalid_roll', subject, detail: `${roll.value} is not a whole number in ${ROLL_MIN}–${ROLL_MAX}` })
    }
    if (index.has(key)) problems.push({ code: 'invalid_roll', subject, detail: 'stored twice' })
    index.set(key, roll.value)
  }

  failIfAny(problems)

  return index
}
