/** What caused a change — the "why" every trace entry carries (§7.5). */
import type { AnswerOptionId, CharacterId, QuestionId } from './ids'

/** The household effect an impact was derived from, with the org's inputs (§4.4). */
export interface DerivedFromEffect {
  raw: string
  members: [CharacterId, CharacterId]
  /** `{input1}` / `{input2}` as the org typed them. */
  inputs: Record<string, number>
}

/**
 * `odpoved` is a character's answer, `anketa` a poll's winning option — its
 * effects are applied once for the poll, not once per voter (§6.6).
 */
export interface EffectSource {
  kind: 'odpoved' | 'anketa'
  /** The poll's own ID when `kind` is `anketa`. */
  questionId: QuestionId
  optionId: AnswerOptionId
  optionLabel: string
  /** Who answered; absent for a poll, which belongs to nobody (§6.6). */
  characterId?: CharacterId
  /** The org filled this one in rather than a player (§6.7). */
  filledByOrg: boolean
  derivedFrom?: DerivedFromEffect
}
