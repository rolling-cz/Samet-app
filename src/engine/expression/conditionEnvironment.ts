/**
 * Binds a variant's compiled condition to real data: answers, poll winners,
 * the working state and stored rolls.
 */
import type { Catalog } from '../catalog/buildCatalog'
import { fail } from '../errors/engineInputError'
import type { AnswerLookup } from '../phases/indexAnswers'
import type { VariationId } from '../types/ids'
import type { RollOwner } from '../types/input'
import type { RollRequest } from '../types/result'
import type { RunState } from '../types/state'
import { rollKey } from '../utils/keys'
import { routeResource } from '../utils/resourceRouting'
import { characterStateOf, readResource } from '../utils/stateAccess'
import type { ConditionEnvironment } from './evaluateCondition'

export interface EnvironmentScope {
  catalog: Catalog
  state: RunState
  answers: AnswerLookup
  pollWinners: Map<string, string>
  /**
   * The last chapter whose answers exist. Reading a later chapter's answer is
   * an error, not `false` — the question has not been asked yet.
   */
  answeredUpTo: number
}

export interface RollScope {
  owner: RollOwner
  variationId: VariationId
  rolls: Map<string, number>
  /** Filled in with every roll the condition needed and did not have. */
  missingRolls: Map<string, RollRequest>
  percentOf: (occurrence: number) => number
}

export const environmentFor = (scope: EnvironmentScope, rolls: RollScope): ConditionEnvironment => ({
  isChosen: (optionId, questionId) => {
    const question =
      scope.catalog.questions.get(questionId) ?? fail('unknown_reference', questionId, 'unknown question')
    if (question.chapter > scope.answeredUpTo) {
      return fail(
        'missing_answer',
        questionId,
        `a condition reads ${optionId}, but chapter ${question.chapter} has not been played yet`,
      )
    }
    // A question that was never asked (its variant was not selected) has no
    // answer, and none of its options was chosen. A question that was asked
    // and not answered never gets here — `indexAnswers` has already failed.
    if (!scope.answers.byQuestion.has(questionId)) return false

    return scope.answers.chosen.has(optionId)
  },
  pollWinner: (pollId) =>
    scope.pollWinners.get(pollId) ?? fail('missing_answer', pollId, 'the poll has no votes to count'),
  scaleValue: (characterId, scaleKey) =>
    characterStateOf(scope.state, characterId).scales[scaleKey] ??
    fail('inconsistent_state', `${characterId}/${scaleKey}`, 'the character has no value for this scale'),
  resourceValue: (owner, resourceKey) => {
    const routed = routeResource(scope.state, owner)

    return { value: readResource(scope.state, routed.account, resourceKey), account: routed.account }
  },
  roll: (occurrence) => {
    const key = rollKey(rolls.owner, rolls.variationId, occurrence)
    const value = rolls.rolls.get(key)
    if (value === undefined) {
      rolls.missingRolls.set(key, {
        ...rolls.owner,
        variationId: rolls.variationId,
        occurrence,
        percent: rolls.percentOf(occurrence),
      })
    }

    return value
  },
})
