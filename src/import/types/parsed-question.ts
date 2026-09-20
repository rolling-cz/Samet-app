import type { ExpressionParse } from '../expression'
import type { ScaleImpact } from '../scale-impact'
import type { Sourced } from './sourced'
import type { AnswerEffectName, QUESTION_TYPES } from '../constants/sheet-vocabulary'

export type ParsedQuestionType = (typeof QUESTION_TYPES)[number]

/** One `HOUSEHOLD_CREATE(Marie, Mirek)` from the `Effects` column (§4.4). */
export interface ParsedAnswerEffect extends Sourced {
  name: AnswerEffectName
  /** Both members' registry IDs, in the order the author wrote them. */
  args: string[]
  raw: string
}

export interface ParsedAnswerOption extends Sourced {
  externalId: string
  label: string
  ordinal: number
  /**
   * `Scale and Resources Impact`, already parsed (§4.2), plus the impacts
   * derived from a household effect (§4.4) — the author writes those nowhere.
   */
  impacts: ScaleImpact[]
  /** `Blocks`: blocks this answer switches on (layer 2). */
  blocks: string[]
  /** `Effects`: structural effects (layer 2). */
  effects: ParsedAnswerEffect[]
  /** Character the option names, resolved from the ID suffix or from an effect. */
  referencedCharacter?: string
  isOther: boolean
  /**
   * The row was not in the sheet: a `bool` question with no `Ano` / `Ne` row
   * gets one with a derived ID and no effects (§6.1).
   */
  isDerived: boolean
}

export interface ParsedQuestion extends Sourced {
  externalId: string
  /** The `ID` cell was empty and the import derived the ID (§4.2). */
  idWasDerived: boolean
  chapter: number
  /** What the author typed in the `Character` column; empty for a `poll`. */
  characterRef: string
  /** Registry ID it resolved to; undefined when nothing matched. */
  characterId?: string
  /** Order within the character's chapter, from 1; undefined for a `poll` (§6.6). */
  ordinal?: number
  text: string
  type: ParsedQuestionType
  source: 'player' | 'org'
  /** The `Private` flag: impacts bypass routing and stay personal (§4.4). */
  isPrivate: boolean
  /** `poll-answer`: the poll ID the `Text` column holds (§6.6). */
  pollRef?: string
  /** `Condition`: the question is asked only when this holds (§4.2, chapters 2+). */
  condition?: ExpressionParse
  /** Target of `scale_direct` / `resource_direct`, taken from the impact column. */
  target?: { kind: 'scale' | 'resource'; owner: string; key: string }
  options: ParsedAnswerOption[]
}
