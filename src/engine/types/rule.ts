/** Rules and the rule set passed to `evaluate` (§7.1). */
import type { CharacterDefinition } from './character'
import type { Effect } from './effect'
import type {
  AnswerOptionId,
  BandId,
  ChapterNumber,
  CharacterId,
  FlagId,
  QuestionId,
  RuleId,
  ScaleId,
} from './ids'
import type { QuestionDefinition } from './question'
import type { FlagDefinition, ScaleDefinition } from './scale'

/**
 * One condition, always structured and never parsed from text (§15).
 * An empty `characterId` means "the character currently being evaluated".
 */
export interface RuleCondition {
  /** Groups are always joined by `OR`. */
  groupIndex: number
  position: number
  /** Joins this condition to the previous one in the group; ignored on the first. */
  connector: 'AND' | 'OR'
  negate: boolean

  subject: 'odpoved' | 'skala' | 'pasmo' | 'priznak' | 'hod'
  operator:
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'not_in'
    | 'obsahuje'
    | 'je_pravda'
    | 'je_nepravda'

  characterId?: CharacterId
  questionId?: QuestionId
  answerOptionId?: AnswerOptionId
  scaleId?: ScaleId
  bandId?: BandId
  flagId?: FlagId

  valueText?: string
  valueNumber?: number
  valueBool?: boolean
  valueList?: string[]
}

/**
 * `CONDITION → EFFECT [priority, weight]`.
 *
 * `isExclusion` marks a rule that prevents an outcome. Exclusions always win
 * over assignment and are applied before any effects.
 */
export interface Rule {
  id: RuleId
  externalId: string
  name: string
  description?: string
  /** NULL in data means the rule applies in every chapter. */
  chapter?: ChapterNumber
  priority: number
  weight: number
  isExclusion: boolean
  isEnabled: boolean
  /** Without this flag, member effects on a shared scale add up (§4.4). */
  appliesOncePerHousehold: boolean
  /** Rule requires a dice roll with this many sides (§7.4). */
  diceSides?: number
  conditions: RuleCondition[]
  effects: Effect[]
}

/** Third argument of `evaluate`: rules plus everything needed to read them. */
export interface RuleSet {
  chapter: ChapterNumber
  rules: Rule[]
  scales: ScaleDefinition[]
  flags: FlagDefinition[]
  characters: CharacterDefinition[]
  questions: QuestionDefinition[]
}
