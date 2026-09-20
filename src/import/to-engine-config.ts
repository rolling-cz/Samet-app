/**
 * `ParsedConfig` to the engine's `EngineConfig` (§7).
 *
 * A straight re-shaping, no logic: the import has already resolved names to
 * registry IDs, derived question and answer IDs and appended the impacts a
 * household effect brings with it. Rows the validation rejected (an owner that
 * matched nobody) are left out — this runs only on a usable config, and the
 * engine's own catalog names anything still dangling.
 */
import type {
  BlockDefinition,
  CharacterDefinition,
  EngineConfig,
  HouseholdEffect,
  ImpactDefinition,
  QuestionDefinition,
  ResourceDefinition,
  ScaleDefinition,
} from '@/engine'
import type { ScaleImpact } from './scale-impact'
import type { ParsedBlock } from './types/parsed-block'
import type { ParsedConfig } from './types/parsed-config'
import type { ParsedAnswerEffect, ParsedQuestion } from './types/parsed-question'

/** The chapter numbers the engine knows; a sheet outside them is not a chapter. */
const isChapter = (chapter: number): chapter is QuestionDefinition['chapter'] =>
  chapter === 1 || chapter === 2 || chapter === 3

const toImpact = (impact: ScaleImpact): ImpactDefinition => {
  const definition: ImpactDefinition = {
    externalId: impact.externalId,
    kind: impact.kind === 'scale' ? 'scale' : 'resource',
    owner: impact.owner,
    key: impact.key,
    forcedPrivate: impact.forcedPrivate,
    mode: impact.mode === 'shift' ? 'shift' : 'absolute',
    fromAnswer: impact.fromAnswer,
    terms: impact.terms.map((term) => ({ ...term })),
    raw: impact.raw,
  }
  if (impact.derivedFrom !== undefined) definition.derivedFrom = impact.derivedFrom

  return definition
}

const toEffect = (effect: ParsedAnswerEffect): HouseholdEffect | undefined => {
  const [first, second] = effect.args
  if (first === undefined || second === undefined) return undefined

  return {
    kind: effect.name === 'HOUSEHOLD_CREATE' ? 'household_create' : 'household_dissolve',
    members: [first, second],
    raw: effect.raw,
  }
}

const toQuestion = (question: ParsedQuestion): QuestionDefinition | undefined => {
  if (!isChapter(question.chapter)) return undefined

  const definition: QuestionDefinition = {
    id: question.externalId,
    chapter: question.chapter,
    text: question.text,
    type: question.type,
    options: question.options.map((option) => ({
      id: option.externalId,
      label: option.label,
      ordinal: option.ordinal,
      isOther: option.isOther,
      impacts: option.impacts.map(toImpact),
      effects: option.effects.map(toEffect).filter((effect) => effect !== undefined),
    })),
  }
  if (question.characterId !== undefined) definition.characterId = question.characterId
  if (question.ordinal !== undefined) definition.ordinal = question.ordinal
  if (question.pollRef !== undefined && question.pollRef !== '') definition.pollId = question.pollRef
  // The engine reads the author's text, so the trace can quote it (§4.5).
  if (question.condition !== undefined) definition.condition = question.condition.raw

  return definition
}

const toBlock = (block: ParsedBlock): BlockDefinition | undefined => {
  if (!isChapter(block.chapter)) return undefined

  const definition: BlockDefinition = {
    id: block.externalId,
    chapter: block.chapter,
    variations: block.variations.map((variation) => {
      const item: BlockDefinition['variations'][number] = {
        id: variation.externalId,
        ordinal: variation.ordinal,
        condition: variation.condition.raw,
        text: variation.text,
      }
      if (variation.priority !== undefined) item.priority = variation.priority

      return item
    }),
  }
  if (block.characterId !== undefined) definition.characterId = block.characterId
  if (block.groupId !== undefined) definition.groupId = block.groupId

  return definition
}

export const toEngineConfig = (config: ParsedConfig): EngineConfig => {
  const characters: CharacterDefinition[] = config.characters.map((character) => {
    const definition: CharacterDefinition = {
      id: character.externalId,
      firstName: character.firstName,
      lastName: character.lastName,
    }
    if (character.householdRef !== undefined) definition.initialHouseholdId = character.householdRef

    return definition
  })

  const scales: ScaleDefinition[] = []
  for (const row of config.scales) {
    if (row.characterId === undefined) continue
    scales.push({
      externalId: row.externalId,
      characterId: row.characterId,
      key: row.key,
      label: row.label,
      min: row.min,
      max: row.max,
      defaultValue: row.defaultValue,
    })
  }

  const resources: ResourceDefinition[] = []
  for (const row of config.resources) {
    const owner: ResourceDefinition['owner'] | undefined =
      row.characterId !== undefined
        ? { kind: 'character', characterId: row.characterId }
        : row.householdRef !== undefined
          ? { kind: 'household', householdId: row.householdRef }
          : undefined
    if (!owner) continue
    resources.push({
      externalId: row.externalId,
      owner,
      key: row.key,
      label: row.label,
      scope: row.scope,
      defaultValue: row.defaultValue,
    })
  }

  const questions: QuestionDefinition[] = []
  for (const chapter of [...config.questions.keys()].sort((a, b) => a - b)) {
    for (const question of config.questions.get(chapter) ?? []) {
      const definition = toQuestion(question)
      if (definition) questions.push(definition)
    }
  }

  const blocks: BlockDefinition[] = []
  for (const chapter of [...config.blocks.keys()].sort((a, b) => a - b)) {
    for (const block of config.blocks.get(chapter) ?? []) {
      const definition = toBlock(block)
      if (definition) blocks.push(definition)
    }
  }

  return {
    characters,
    groups: config.groups.map((group) => ({ id: group.externalId, name: group.name })),
    scales,
    resources,
    questions,
    blocks,
  }
}
