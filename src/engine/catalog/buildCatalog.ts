/**
 * Lookups over the config, built once per `evaluate`, and the checks that make
 * the rest of the engine safe to write without defensive branches.
 *
 * Everything found wrong is thrown together: a config that reaches the engine
 * broken is a bug in the import, and one run should list all of it.
 */
import { failIfAny, type EngineProblem } from '../errors/engineInputError'
import type { BlockDefinition, VariationDefinition } from '../types/block'
import type { CharacterDefinition, GroupDefinition } from '../types/character'
import type { ResourceReference } from '../types/condition'
import type { EngineConfig } from '../types/config'
import type {
  AnswerOptionId,
  BlockId,
  CharacterId,
  GroupId,
  QuestionId,
  ResourceKey,
  VariationId,
} from '../types/ids'
import type { ImpactDefinition } from '../types/impact'
import type { AnswerOptionDefinition, QuestionDefinition } from '../types/question'
import type { ResourceDefinition } from '../types/resource'
import type { ScaleDefinition } from '../types/scale'
import { compareIds } from '../utils/compareIds'
import { householdExternalId } from '../utils/householdId'
import { characterResourceReference } from '../utils/resourceRouting'
import { splitHouseholdId } from '../utils/splitHouseholdId'

export interface OptionEntry {
  question: QuestionDefinition
  option: AnswerOptionDefinition
}

export interface VariationEntry {
  block: BlockDefinition
  variation: VariationDefinition
}

export interface Catalog {
  config: EngineConfig
  /** Sorted, so iteration never follows row order in the sheet. */
  characterIds: CharacterId[]
  characters: Map<CharacterId, CharacterDefinition>
  groups: Map<GroupId, GroupDefinition>
  /** `S_Marie_Regime` → its definition. */
  scales: Map<string, ScaleDefinition>
  /** `R_Marie_Wealth` / `R_MarieMirek_Wealth` → the row from the sheet. */
  resources: Map<string, ResourceDefinition>
  /** The scope belongs to the resource, not to the pair (§4.4). */
  resourceScopes: Map<ResourceKey, ResourceDefinition['scope']>
  questions: Map<QuestionId, QuestionDefinition>
  options: Map<AnswerOptionId, OptionEntry>
  blocks: Map<BlockId, BlockDefinition>
  variations: Map<VariationId, VariationEntry>
  /**
   * `R_<Owner>_<Key>` to the account it names (§4.4). A household is a valid
   * owner as long as both members exist — it may be named before it exists.
   */
  resolveResource: (owner: string, key: ResourceKey, forcedPrivate: boolean) => ResourceReference | undefined
}

const indexUnique = <T>(items: T[], idOf: (item: T) => string, problems: EngineProblem[]): Map<string, T> => {
  const index = new Map<string, T>()
  for (const item of items) {
    const id = idOf(item)
    if (index.has(id)) problems.push({ code: 'duplicate_id', subject: id, detail: 'appears twice in the config' })
    index.set(id, item)
  }

  return index
}

export const buildCatalog = (config: EngineConfig): Catalog => {
  const problems: EngineProblem[] = []
  const missing = (subject: string, detail: string): void => {
    problems.push({ code: 'unknown_reference', subject, detail })
  }

  const characters = indexUnique(config.characters, (character) => character.id, problems)
  const groups = indexUnique(config.groups, (group) => group.id, problems)
  const scales = indexUnique(config.scales, (scale) => scale.externalId, problems)
  const resources = indexUnique(config.resources, (resource) => resource.externalId, problems)
  const questions = indexUnique(config.questions, (question) => question.id, problems)
  const blocks = indexUnique(config.blocks, (block) => block.id, problems)

  const characterIds = [...characters.keys()].sort(compareIds)

  const resourceScopes = new Map<ResourceKey, ResourceDefinition['scope']>()
  for (const resource of config.resources) {
    const agreed = resourceScopes.get(resource.key)
    if (agreed !== undefined && agreed !== resource.scope) {
      missing(resource.externalId, `scope ${resource.scope} disagrees with ${agreed} on the same resource`)
    }
    resourceScopes.set(resource.key, agreed ?? resource.scope)
  }

  const resolveResource: Catalog['resolveResource'] = (owner, key, forcedPrivate) => {
    if (!resourceScopes.has(key)) return undefined

    if (characters.has(owner)) {
      return characterResourceReference(owner, key, resourceScopes.get(key) ?? 'household', forcedPrivate)
    }

    if (forcedPrivate) return undefined
    const members = splitHouseholdId(owner, characterIds)
    if (!members || resourceScopes.get(key) !== 'household') return undefined

    return { kind: 'household', householdId: owner }
  }

  const checkCharacter = (characterId: CharacterId | undefined, owner: string): void => {
    if (characterId !== undefined && !characters.has(characterId)) {
      missing(owner, `unknown character ${characterId}`)
    }
  }

  for (const character of config.characters) {
    if (character.initialHouseholdId === undefined) continue
    const members = splitHouseholdId(character.initialHouseholdId, characterIds)
    if (!members || !members.includes(character.id)) {
      missing(character.id, `household ${character.initialHouseholdId} is not a pair including the character`)
    }
  }

  for (const scale of config.scales) {
    checkCharacter(scale.characterId, scale.externalId)
    if (scale.min > scale.max) missing(scale.externalId, `min ${scale.min} is above max ${scale.max}`)
    if (!Number.isInteger(scale.defaultValue) || scale.defaultValue < scale.min || scale.defaultValue > scale.max) {
      missing(scale.externalId, `default ${scale.defaultValue} is outside ${scale.min}–${scale.max}`)
    }
  }

  for (const resource of config.resources) {
    if (resource.owner.kind === 'character') {
      checkCharacter(resource.owner.characterId, resource.externalId)
      continue
    }
    const members = splitHouseholdId(resource.owner.householdId, characterIds)
    if (!members) missing(resource.externalId, `household ${resource.owner.householdId} is not a pair of characters`)
    else if (resource.scope !== 'household') missing(resource.externalId, 'a private resource has no joint account')
  }

  const checkImpact = (impact: ImpactDefinition, owner: string): void => {
    if (impact.kind === 'scale') {
      if (!scales.has(impact.externalId)) missing(owner, `unknown scale ${impact.externalId}`)

      return
    }
    if (!resolveResource(impact.owner, impact.key, impact.forcedPrivate)) {
      missing(owner, `unknown resource ${impact.raw}`)
    }
    // Absolute setting must name a concrete account (§4.4); routing is forbidden.
    if (impact.mode === 'absolute' && characters.has(impact.owner) && !impact.forcedPrivate && resourceScopes.get(impact.key) === 'household') {
      missing(owner, `absolute setting of ${impact.raw} uses a routed name; write _private or the household`)
    }
  }

  const options = new Map<AnswerOptionId, OptionEntry>()
  for (const question of config.questions) {
    checkCharacter(question.characterId, question.id)
    if (question.type === 'poll' && question.characterId !== undefined) {
      missing(question.id, 'a poll belongs to no character')
    }
    if (question.type === 'poll-answer') {
      const poll = question.pollId === undefined ? undefined : questions.get(question.pollId)
      if (!poll || poll.type !== 'poll') missing(question.id, `poll ${question.pollId ?? '?'} does not exist`)
    }

    for (const option of question.options) {
      if (options.has(option.id)) {
        problems.push({ code: 'duplicate_id', subject: option.id, detail: 'appears twice in the config' })
      }
      options.set(option.id, { question, option })
      for (const impact of option.impacts) checkImpact(impact, option.id)
      for (const effect of option.effects) {
        for (const member of effect.members) checkCharacter(member, option.id)
        if (effect.members[0] === effect.members[1]) missing(option.id, `${effect.raw} names the same character twice`)
      }
    }
  }

  const variations = new Map<VariationId, VariationEntry>()
  for (const block of config.blocks) {
    checkCharacter(block.characterId, block.id)
    if (block.groupId !== undefined && !groups.has(block.groupId)) missing(block.id, `unknown group ${block.groupId}`)
    if (block.characterId === undefined && block.groupId === undefined) missing(block.id, 'block has no owner')

    for (const variation of block.variations) {
      if (variations.has(variation.id)) {
        problems.push({ code: 'duplicate_id', subject: variation.id, detail: 'appears twice in the config' })
      }
      variations.set(variation.id, { block, variation })
    }
  }

  // `Condition` names one variant of the same character and chapter (§4.5);
  // anything else would make the lookup quietly answer "not asked".
  for (const question of config.questions) {
    if (question.conditionVariationId === undefined) continue
    const owner = variations.get(question.conditionVariationId)?.block
    const report = (detail: string): void => {
      problems.push({ code: 'invalid_question_condition', subject: question.id, detail })
    }

    if (!owner) report(`${question.conditionVariationId} is not a variant of any block`)
    else if (owner.chapter !== question.chapter) {
      report(`${question.conditionVariationId} belongs to chapter ${owner.chapter}, the question to chapter ${question.chapter}`)
    } else if (owner.characterId === undefined || owner.characterId !== question.characterId) {
      report(`${question.conditionVariationId} belongs to ${owner.characterId ?? owner.groupId ?? '?'}, not to ${question.characterId ?? 'nobody'}`)
    }
  }

  failIfAny(problems)

  return {
    config,
    characterIds,
    characters,
    groups,
    scales,
    resources,
    resourceScopes,
    questions,
    options,
    blocks,
    variations,
    resolveResource,
  }
}

/** The joint account's ID for two members, whatever order they were named in. */
export const householdIdOf = (members: readonly [CharacterId, CharacterId]): string =>
  householdExternalId(members[0], members[1])
