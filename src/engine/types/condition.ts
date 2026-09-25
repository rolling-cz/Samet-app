/**
 * A condition compiled from the author's expression, with every reference
 * resolved (§4.5).
 *
 * Resolution happens before anything is evaluated: evaluation short-circuits,
 * and a typo behind an `AND` that happens to be false has to fail just as
 * loudly as one that is reached.
 */
import type { ComparisonOperator } from '../constants/expressionLanguage'
import type {
  AnswerOptionId,
  ChapterNumber,
  CharacterId,
  HouseholdId,
  QuestionId,
  ResourceKey,
  ScaleKey,
} from './ids'

/**
 * Which account `R_…` names (§4.4). `smerovany` is the plain form the author
 * writes most of the time — the account follows from marital status after the
 * structural phase.
 */
export type ResourceReference =
  | { kind: 'routed'; characterId: CharacterId }
  /** `_private` was written, or the resource has no joint account at all. */
  | { kind: 'personal'; characterId: CharacterId; reason: 'forced_private' | 'private_resource' }
  | { kind: 'household'; householdId: HouseholdId }

export type CompiledNumber =
  | { kind: 'number'; value: number }
  | { kind: 'scale'; reference: string; characterId: CharacterId; scaleKey: ScaleKey }
  | { kind: 'resource'; reference: string; owner: ResourceReference; resourceKey: ResourceKey }

export type CompiledCondition =
  /** `DEFAULT` or an empty cell — the fallback, always true (§8.2). */
  | { kind: 'always' }
  | {
      kind: 'answer'
      reference: string
      optionId: AnswerOptionId
      questionId: QuestionId
      questionChapter: ChapterNumber
    }
  /** The winning option of a poll, spelled like any other answer (§6.6). */
  | { kind: 'poll'; reference: string; pollId: QuestionId; optionId: AnswerOptionId }
  /**
   * An answer the config does not know, or a `???` placeholder. The author
   * asked for it to read as "not chosen" while the other characters' sheets
   * are still being written; the import warns about every one.
   */
  | { kind: 'unknown_answer'; reference: string }
  | { kind: 'random'; reference: string; percent: number; occurrence: number }
  | { kind: 'not'; operand: CompiledCondition }
  | { kind: 'and' | 'or'; left: CompiledCondition; right: CompiledCondition }
  | {
      kind: 'compare'
      operator: ComparisonOperator
      left: CompiledNumber
      right: CompiledNumber
    }

/** `neznamo` means a roll is missing — nothing else can be undecided. */
export type ConditionResult = 'holds' | 'fails' | 'unknown'

/**
 * A value the evaluation actually read, so the UI can explain the outcome
 * without running it again.
 */
export interface ConditionReading {
  /** As the author wrote it: `A_Marie_2_1_Mirek`, `R_Marie_Wealth`, `RANDOM(50)`. */
  reference: string
  /** `null` when the value was not available. */
  value: boolean | number | null
  /** Which account a routed resource was read from (§4.4). */
  note?: string
  /** The reference is an unknown answer or a placeholder, read as `false`. */
  unknown?: true
}
