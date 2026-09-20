/** What `evaluate` returns. */
import type { RollOwner } from './input'
import type { Conflict } from './conflict'
import type {
  BlockId,
  ChapterNumber,
  CharacterId,
  GroupId,
  QuestionId,
  VariationId,
} from './ids'
import type { RunState } from './state'
import type { TraceEntry } from './trace'

/**
 * A roll the computation needs and does not have (§7.4). The caller rolls it,
 * stores it and runs again; a recomputation never re-rolls.
 */
export interface RollRequest extends RollOwner {
  variationId: VariationId
  occurrence: number
  /** The percentage from the expression, for the record. */
  percent: number
}

export interface VariantSelection {
  blockId: BlockId
  characterId?: CharacterId
  groupId?: GroupId
  /** `undecided` only ever means a missing roll (§7.4). */
  status: 'selected' | 'undecided'
  variationId: VariationId | null
  /** An empty string is a valid text: the marker vanishes without trace (§8.2). */
  text: string | null
}

/**
 * Whether a question of the next chapter is put in front of the org (§4.5).
 * While its block is undecided the question reads as not asked — the result is
 * a draft until `missingRolls` is empty anyway.
 */
export interface QuestionGate {
  questionId: QuestionId
  characterId?: CharacterId
  asked: boolean
}

/**
 * The computation is final only when `conflicts` and `missingRolls` are both
 * empty; otherwise it is a draft the org has to settle first (§7.3).
 *
 * `variants` and `questions` describe the **next** chapter: computing chapter N
 * produces the documents and the questionnaire handed out at the start of
 * chapter N+1 (see `NEXT_CHAPTER_OFFSET`). `state.selectedVariants` carries the
 * same selection as bare IDs per owner, for the caller to store with the
 * snapshot (§4.3).
 */
export interface EvaluateResult {
  /** A new object; the input state is never modified — the engine is pure. */
  state: RunState
  trace: TraceEntry[]
  conflicts: Conflict[]
  missingRolls: RollRequest[]
  nextChapter: ChapterNumber | undefined
  variants: VariantSelection[]
  questions: QuestionGate[]
}
