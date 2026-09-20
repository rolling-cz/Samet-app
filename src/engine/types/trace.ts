/**
 * Trace — the data behind every "why" in the UI (§7.5, architecture rule 1).
 *
 * Labelled data, never finished sentences: the wording belongs to the UI and
 * must be changeable without recomputing. The array order is the order of
 * evaluation.
 *
 * An entry is written even when the contributions cancel out: "nothing changed"
 * is an answer the org may need to explain too.
 */
import type { ResourceAccount, RoutingReason } from './account'
import type { ConditionReading, ConditionResult } from './condition'
import type {
  AnswerOptionId,
  BlockId,
  CharacterId,
  GroupId,
  HouseholdId,
  QuestionId,
  ResourceKey,
  ScaleKey,
  VariationId,
} from './ids'
import type { EffectSource } from './source'

/**
 * The fixed evaluation order (§7.3). `varianty` and `otazky` come after all of
 * them: both are read over the finished state (§8.2).
 */
export type TracePhase = 'collection' | 'structural' | 'values' | 'conflicts' | 'variants' | 'questions'

/** One option's result in a poll, in the order the definition lists them (§6.6). */
export interface PollTally {
  optionId: AnswerOptionId
  optionLabel: string
  ordinal: number
  votes: number
  voterIds: CharacterId[]
}

export interface PollTrace {
  phase: 'collection'
  kind: 'poll'
  pollId: QuestionId
  winnerOptionId: AnswerOptionId
  /** The winner had no more votes than another option, so row order decided. */
  decidedByRowOrder: boolean
  tally: PollTally[]
}

export interface HouseholdTrace {
  phase: 'structural'
  kind: 'household_create' | 'household_dissolve'
  householdId: HouseholdId
  memberIds: [CharacterId, CharacterId]
  source: EffectSource
  /** Joint balances at the moment of the dissolution, before they are paid out. */
  balances?: Record<ResourceKey, number>
}

export interface ScaleSetTrace {
  phase: 'values'
  kind: 'scale_set'
  characterId: CharacterId
  scaleKey: ScaleKey
  before: number
  after: number
  source: EffectSource
}

export interface ResourceSetTrace {
  phase: 'values'
  kind: 'resource_set'
  account: ResourceAccount
  resourceKey: ResourceKey
  routing: RoutingReason
  before: number
  after: number
  source: EffectSource
}

export interface ScaleShiftTrace {
  phase: 'values'
  kind: 'scale_shift'
  characterId: CharacterId
  scaleKey: ScaleKey
  before: number
  delta: number
  /** Before clamping; equal to `after` when the value stayed inside the range. */
  raw: number
  after: number
  source: EffectSource
}

/**
 * A scale hit a bound (§4.1). Reported on its own because it signals badly
 * tuned weights, not a detail to keep quiet about.
 */
export interface ClampTrace {
  phase: 'values'
  kind: 'clamp'
  characterId: CharacterId
  scaleKey: ScaleKey
  raw: number
  after: number
  bound: 'min' | 'max'
  source: EffectSource
}

export interface ResourceShiftTrace {
  phase: 'values'
  kind: 'resource_shift'
  account: ResourceAccount
  resourceKey: ResourceKey
  /** Which account this landed on and why (§4.4). */
  routing: RoutingReason
  before: number
  delta: number
  after: number
  source: EffectSource
}

export interface ConflictTrace {
  phase: 'conflicts'
  kind: 'conflict'
  /** Index into `EvaluateResult.conflicts`. */
  conflictIndex: number
}

export interface VariationEvaluation {
  variationId: VariationId
  priority?: number
  ordinal: number
  result: ConditionResult
  readings: ConditionReading[]
}

export interface VariantTrace {
  phase: 'variants'
  kind: 'variant'
  blockId: BlockId
  characterId?: CharacterId
  groupId?: GroupId
  /** `null` while a missing roll leaves the block undecided (§7.4). */
  variationId: VariationId | null
  /** Up to and including the deciding variant; the rest were never read. */
  evaluations: VariationEvaluation[]
}

export interface QuestionGateTrace {
  phase: 'questions'
  kind: 'question'
  questionId: QuestionId
  characterId?: CharacterId
  asked: boolean
  /** Absent when the `Condition` cell is empty — the question is always asked. */
  condition?: {
    /** The variant the question waits for (§4.5). */
    variationId: VariationId
    blockId: BlockId
    /** What that block returned instead; `null` while a missing roll leaves it undecided. */
    selectedVariationId: VariationId | null
  }
}

export type TraceEntry =
  | PollTrace
  | HouseholdTrace
  | ScaleSetTrace
  | ResourceSetTrace
  | ScaleShiftTrace
  | ClampTrace
  | ResourceShiftTrace
  | ConflictTrace
  | VariantTrace
  | QuestionGateTrace
