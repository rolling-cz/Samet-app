/**
 * Evaluates a compiled condition in three-valued (Kleene) logic.
 *
 * The only unknown is a missing roll. `false AND unknown` is still `false`, so
 * a roll is requested only when it could change the result (§7.4). Everything
 * else is either known or a loud error.
 */
import type { ComparisonOperator } from '../constants/expressionLanguage'
import type { ResourceAccount } from '../types/account'
import type {
  CompiledCondition,
  CompiledNumber,
  ConditionReading,
  ConditionResult,
  ResourceReference,
} from '../types/condition'
import type { AnswerOptionId, CharacterId, QuestionId, ResourceKey, ScaleKey } from '../types/ids'

export interface ResourceReadingValue {
  value: number
  account: ResourceAccount
}

export interface ConditionEnvironment {
  isChosen: (optionId: AnswerOptionId, questionId: QuestionId) => boolean
  pollWinner: (pollId: QuestionId) => AnswerOptionId
  scaleValue: (characterId: CharacterId, scaleKey: ScaleKey) => number
  resourceValue: (owner: ResourceReference, resourceKey: ResourceKey) => ResourceReadingValue
  roll: (occurrence: number) => number | undefined
}

export interface ConditionOutcome {
  result: ConditionResult
  readings: ConditionReading[]
  /** Occurrences whose roll is missing and would have been read. */
  missingRollOccurrences: number[]
}

/** `null` is unknown. */
type Truth = boolean | null

const compare = (operator: ComparisonOperator, left: number, right: number): boolean => {
  switch (operator) {
    case '==':
      return left === right
    case '!=':
      return left !== right
    case '>':
      return left > right
    case '<':
      return left < right
    case '>=':
      return left >= right
    case '<=':
      return left <= right
  }
}

const toResult = (truth: Truth): ConditionResult => {
  if (truth === null) return 'unknown'

  return truth ? 'holds' : 'fails'
}

const describeAccount = (account: ResourceAccount): string =>
  account.kind === 'personal' ? `personal:${account.characterId}` : `household:${account.householdId}`

export const evaluateCondition = (
  condition: CompiledCondition,
  environment: ConditionEnvironment,
): ConditionOutcome => {
  const readings: ConditionReading[] = []
  const missingRollOccurrences: number[] = []

  const numberOf = (operand: CompiledNumber): number => {
    if (operand.kind === 'number') return operand.value
    if (operand.kind === 'scale') {
      const value = environment.scaleValue(operand.characterId, operand.scaleKey)
      readings.push({ reference: operand.reference, value })

      return value
    }

    const reading = environment.resourceValue(operand.owner, operand.resourceKey)
    readings.push({ reference: operand.reference, value: reading.value, note: describeAccount(reading.account) })

    return reading.value
  }

  const truthOf = (node: CompiledCondition): Truth => {
    switch (node.kind) {
      case 'always':
        return true
      case 'answer': {
        const chosen = environment.isChosen(node.optionId, node.questionId)
        readings.push({ reference: node.reference, value: chosen })

        return chosen
      }
      case 'poll': {
        const won = environment.pollWinner(node.pollId) === node.optionId
        readings.push({ reference: node.reference, value: won })

        return won
      }
      case 'unknown_answer':
        readings.push({ reference: node.reference, value: false, unknown: true })

        return false
      case 'random': {
        const roll = environment.roll(node.occurrence)
        readings.push({ reference: node.reference, value: roll ?? null })
        if (roll === undefined) {
          missingRollOccurrences.push(node.occurrence)

          return null
        }

        return roll <= node.percent
      }
      case 'not': {
        const operand = truthOf(node.operand)

        return operand === null ? null : !operand
      }
      case 'and': {
        const left = truthOf(node.left)
        if (left === false) return false
        const right = truthOf(node.right)
        if (right === false) return false

        return left === null || right === null ? null : true
      }
      case 'or': {
        const left = truthOf(node.left)
        if (left === true) return true
        const right = truthOf(node.right)
        if (right === true) return true

        return left === null || right === null ? null : false
      }
      case 'compare':
        return compare(node.operator, numberOf(node.left), numberOf(node.right))
    }
  }

  const truth = truthOf(condition)

  return { result: toResult(truth), readings, missingRollOccurrences }
}
