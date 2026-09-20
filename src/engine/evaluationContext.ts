/**
 * Working data of one `evaluate` call. Created there and never shared, so the
 * function stays pure.
 */
import type { Catalog } from './catalog/buildCatalog'
import type { AnswerIndex } from './phases/indexAnswers'
import type { PollResults } from './phases/resolvePolls'
import type { Conflict } from './types/conflict'
import type { ChapterNumber } from './types/ids'
import type { RollRequest } from './types/result'
import type { RunState } from './types/state'
import type { TraceEntry } from './types/trace'

export interface EvaluationContext {
  chapter: ChapterNumber
  catalog: Catalog
  answers: AnswerIndex
  polls: PollResults
  /** Stored rolls by `rollKey`. */
  rolls: Map<string, number>
  /** A deep copy of the caller's state that the phases change. */
  state: RunState
  trace: TraceEntry[]
  conflicts: Conflict[]
  missingRolls: Map<string, RollRequest>
  /**
   * Households dissolved this chapter. Their joint account stays readable until
   * the value phase has paid it out (§4.4); they leave the state afterwards.
   */
  dissolvedHouseholdIds: Set<string>
  /**
   * Household effects the structural phase refused (§4.4). Impacts derived from
   * them must not move any money either.
   */
  rejectedEffectKeys: Set<string>
}

export const addConflict = (context: EvaluationContext, conflict: Conflict): void => {
  context.conflicts.push(conflict)
  context.trace.push({ phase: 'conflicts', kind: 'conflict', conflictIndex: context.conflicts.length - 1 })
}
