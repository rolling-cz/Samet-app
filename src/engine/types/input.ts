/** Recorded answers and rolls — the second argument of `evaluate`. */
import type {
  AnswerOptionId,
  ChapterNumber,
  CharacterId,
  GroupId,
  QuestionId,
  VariationId,
} from './ids'

/**
 * A recorded answer. There are no default answers (§6.3): a question that was
 * asked and has no entry here stops the computation, and the engine fills in
 * nothing.
 *
 * Answers accumulate across chapters — a condition in chapter 2 reads chapter
 * 1's answers, so every chapter played so far belongs in the list.
 */
export interface AnswerInput {
  questionId: QuestionId
  /**
   * Chosen options. For `poll-answer` these are the poll's option IDs; for
   * `scale_direct` / `resource_direct` the single option carrying `=VALUE`.
   */
  selectedOptionIds: AnswerOptionId[]
  /** The number behind `=VALUE` on a `scale_direct` / `resource_direct` answer. */
  value?: number
  /**
   * What the org typed into the `{input}` fields a household effect raised,
   * per option and placeholder name (§4.4). Nothing here is ever computed or
   * halved — a missing value is a conflict, not a guess.
   */
  inputs?: Record<AnswerOptionId, Record<string, number>>
  /** Free text behind an `_OTHER_` option; carries no impact of its own. */
  freeText?: string
  filledByOrg: boolean
}

/**
 * Who the roll belongs to. A block is owned by a character or by a group
 * (§8.2), and a group's document rolls just as a character's does.
 */
export interface RollOwner {
  ownerKind: 'postava' | 'skupina'
  ownerId: CharacterId | GroupId
}

/**
 * An already rolled die (§7.4). The engine never rolls: it gets the stored
 * values and returns the ones it still needs.
 *
 * Each `RANDOM(n)` in one expression has its own roll, told apart by
 * `occurrence` — counted left to right from 0, so `RANDOM(50) AND RANDOM(50)`
 * is 25 % and not 50 %.
 */
export interface RollInput extends RollOwner {
  variationId: VariationId
  occurrence: number
  /** 1–100, compared against the percentage in the expression. */
  value: number
}

export interface EvaluationInputs {
  chapter: ChapterNumber
  answers: AnswerInput[]
  rolls: RollInput[]
}
