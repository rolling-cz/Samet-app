import type { questionSource } from '@/db/schema'
import type { QuestionType } from '@/engine'
import type { CharacterStateView } from './character-state-view'

/** A character as the questionnaire names them: registry ID plus the registry name, never a hardcoded one. */
export interface PersonView {
  id: string
  firstName: string
  lastName: string
}

/** One `{input}` field an option raises (§4.4). The same key is one field, however many impacts read it. */
export interface InputFieldView {
  /** Placeholder name without braces: `input1`. */
  key: string
  /** Whose money the field moves; absent for an `{input}` the author wrote by hand. */
  person?: PersonView
}

export interface HouseholdEffectView {
  kind: 'household_create' | 'household_dissolve'
  householdId: string
  /**
   * Joint balance of the transferred resource before the chapter — what a
   * dissolution's inputs must add up to. Absent when the household does not
   * exist then; the engine reports that as a conflict, not the questionnaire.
   */
  jointBalance?: number
}

export interface OptionView {
  /** `A_Marie_1_1_Karel`. */
  id: string
  label: string
  isOther: boolean
  /** The character the option names, so the UI shows a name and not the ID. */
  referencedPerson?: PersonView
  inputs: InputFieldView[]
  householdEffect?: HouseholdEffectView
}

export type DirectAccountView =
  | { _type: 'personal'; owner: PersonView }
  | { _type: 'household'; householdId: string; members: PersonView[] }

/** What a `scale_direct` / `resource_direct` question sets (§4.4): always one concrete scale or account. */
export type DirectTargetView =
  | { _type: 'scale'; externalId: string; label: string; owner: PersonView; min: number; max: number; value: number }
  | {
      _type: 'resource'
      label: string
      account: DirectAccountView
      /** Absent when the joint account does not exist before the chapter. */
      value?: number
    }

export interface AnswerView {
  boolValue: boolean | null
  numericValue: number | null
  textValue: string | null
  selectedOptionIds: string[]
  /** Per option and placeholder name, as the engine takes them. */
  inputValues: Record<string, Record<string, number>>
  answeredBy: string
  /** ISO timestamp; formatting is the UI's. */
  answeredAt: string
}

export type AskedQuestionType = Exclude<QuestionType, 'poll'>

export interface QuestionView {
  /** `Q_Marie_1_1`. */
  id: string
  ordinal: number
  type: AskedQuestionType
  source: (typeof questionSource.enumValues)[number]
  /** A `poll-answer` shows its poll's text and options (§6.6). */
  text: string
  helpText: string | null
  pollId?: string
  options: OptionView[]
  target?: DirectTargetView
  answer?: AnswerView
}

export interface QuestionnaireView {
  character: PersonView
  questions: QuestionView[]
  /** State before the chapter — a snapshot, never an estimate from the answers above it. */
  state: CharacterStateView
  /** Who the joint account is shared with. */
  partners: PersonView[]
}

export type Questionnaire =
  | { _type: 'ready'; questionnaire: QuestionnaireView }
  | { _type: 'blocked'; missingChapter: number }
