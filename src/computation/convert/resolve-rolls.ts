import type { EvaluateResult, RollInput } from '@/engine'
import { MAX_ROLL_ROUNDS } from '../constants/roll-rounds'
import { RollLoopError } from '../errors/rollLoopError'
import { compareRolls } from './rolls-from-rows'

export interface ResolvedRolls {
  result: EvaluateResult
  /** Every roll the final evaluation saw: stored ones plus `newRolls`. */
  rolls: RollInput[]
  /** Rolled here, to be stored with the computation; a stored roll is never rolled again (§7.4). */
  newRolls: RollInput[]
}

/**
 * The engine never rolls: it returns what it lacks, the caller rolls and runs
 * it again. A further roll may surface only once an earlier one is decided, so
 * this repeats — up to `maxRounds`, and then fails rather than spin.
 */
export const resolveRolls = (
  evaluateWith: (rolls: RollInput[]) => EvaluateResult,
  storedRolls: readonly RollInput[],
  rollDie: () => number,
  maxRounds: number = MAX_ROLL_ROUNDS,
): ResolvedRolls => {
  const rolls = [...storedRolls]
  const newRolls: RollInput[] = []

  for (let round = 0; round <= maxRounds; round += 1) {
    const result = evaluateWith([...rolls].sort(compareRolls))
    if (result.missingRolls.length === 0) return { result, rolls: rolls.sort(compareRolls), newRolls }
    if (round === maxRounds) break

    for (const request of result.missingRolls) {
      const roll: RollInput = {
        ownerKind: request.ownerKind,
        ownerId: request.ownerId,
        variationId: request.variationId,
        occurrence: request.occurrence,
        value: rollDie(),
      }
      rolls.push(roll)
      newRolls.push(roll)
    }
  }

  throw new RollLoopError(maxRounds)
}
