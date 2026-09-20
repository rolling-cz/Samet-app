import type { EngineProblem, RollInput } from '@/engine'
import type { MissingAnswer } from './missing-answer'

/**
 * What asking for a computation ends with. Only `computed` wrote anything; the
 * rest are answers for the org, returned as data — a computation that cannot
 * run must never take the screen down with it.
 */
export type ComputationOutcome =
  | {
      _type: 'computed'
      computationId: string
      chapter: number
      version: number
      conflictCount: number
      /** Rolled and stored by this computation; stored rolls are never rolled again (§7.4). */
      newRolls: RollInput[]
      inputHash: string
    }
  /** Nothing is ever filled in for the org (§6.3). */
  | { _type: 'missing_answers'; missingAnswers: MissingAnswer[] }
  /** The engine refused its input for another reason — a bug upstream, shown as it is. */
  | { _type: 'rejected'; problems: EngineProblem[] }
  | { _type: 'no_config' }
  | { _type: 'config_unusable'; filename: string; errors: string[] }
  /** Chapter N ≥ 2 starts from the baseline computation of chapter N−1. */
  | { _type: 'no_baseline'; missingChapter: number }
  | { _type: 'unknown_chapter'; chapter: number }
