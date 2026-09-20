/**
 * Questions and their answer options (§6.1, §6.6).
 *
 * Who fills a question in — a player or the org — is deliberately not here: it
 * is a different input source, not a different mechanism (§6.7).
 */
import type { HouseholdEffect } from './effect'
import type { AnswerOptionId, ChapterNumber, CharacterId, QuestionId, VariationId } from './ids'
import type { ImpactDefinition } from './impact'

/** As the author spells it in the `Type` column (§6.1). */
export type QuestionType =
  | 'bool'
  | 'single'
  | 'multi'
  | 'poll'
  | 'poll-answer'
  | 'scale_direct'
  | 'resource_direct'

export interface AnswerOptionDefinition {
  id: AnswerOptionId
  label: string
  /** Row order within the question, from 1 — the poll's tie-break (§6.6). */
  ordinal: number
  /** Free text typed in by the org (`_OTHER_`); carries no impact of its own. */
  isOther: boolean
  impacts: ImpactDefinition[]
  effects: HouseholdEffect[]
}

export interface QuestionDefinition {
  id: QuestionId
  chapter: ChapterNumber
  /** Questions are per character; a `poll` belongs to nobody (§6.6). */
  characterId?: CharacterId
  /** Order within the character's chapter; a `poll` takes none (§6.6). */
  ordinal?: number
  text: string
  type: QuestionType
  /** `poll-answer`: the poll whose text, options and effects it uses (§6.6). */
  pollId?: QuestionId
  /**
   * The `Condition` column (§4.5): not an expression but one variant of the
   * same character and chapter. The question is asked only when that variant
   * was selected; absent means always asked.
   */
  conditionVariationId?: VariationId
  /** In row order; a `poll-answer` has none of its own — it votes among the poll's (§6.6). */
  options: AnswerOptionDefinition[]
}
