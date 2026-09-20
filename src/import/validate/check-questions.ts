import { CHARACTER_ARGUMENT_EFFECTS, GROUP_ARGUMENT_EFFECTS } from '../constants/sheet-vocabulary'
import type { IssueCollector } from '../issue-collector'
import type { ParsedConfig } from '../types/parsed-config'
import type { ParsedQuestion } from '../types/parsed-question'
import { suggestClosest } from '../utils/suggest-closest'
import { answersUpTo, checkConditionReferences, type ReferenceScope } from './check-references'
import { householdResourceIds, knownResourceIds, knownScaleIds } from './known-scale-ids'

export const checkQuestions = (
  config: ParsedConfig,
  characterIds: Set<string>,
  groupIds: Set<string>,
  issues: IssueCollector,
): void => {
  const knownCharacters = [...characterIds]
  const knownGroups = [...groupIds]
  const scaleIds = knownScaleIds(config)
  const resourceIds = knownResourceIds(config)
  const jointIds = householdResourceIds(config)
  const polls = collectPolls(config)

  for (const [chapter, questions] of config.questions) {
    const blockIds = new Set((config.blocks.get(chapter) ?? []).map((b) => b.externalId))
    const knownBlockIds = [...blockIds]
    const scope: ReferenceScope = {
      chapter,
      answerIds: answersUpTo(config.questions, chapter),
      scaleIds,
      resourceIds: new Set([...resourceIds, ...jointIds]),
    }

    for (const question of questions) {
      checkOwner(question, characterIds, knownCharacters, issues)
      checkPollReference(question, polls, issues)

      // A question may be conditional from chapter 2 on (§4.2); the language is
      // the same as a variant's, and so is the typo.
      if (question.condition) {
        checkConditionReferences(
          question.condition,
          `Podmínka otázky \`${question.externalId}\``,
          question.location,
          scope,
          issues,
        )
      }

      for (const option of question.options) {
        for (const impact of option.impacts) {
          if (impact.kind === 'skala' && !scaleIds.has(impact.externalId)) {
            issues.error(
              'neznama_skala',
              option.location,
              `Škála \`${impact.externalId}\` neexistuje — v listu \`Scales\` není řádek postavy \`${impact.owner}\` se škálou \`${impact.key}\`.`,
              { value: impact.externalId, suggestion: suggestClosest(impact.externalId, scaleIds) },
            )
          }
          if (
            impact.kind === 'zdroj' &&
            !resourceIds.has(impact.externalId) &&
            !jointIds.has(impact.externalId)
          ) {
            const swapped = householdOutOfOrder(impact.owner, characterIds)
            if (swapped) {
              issues.error(
                'poradi_domacnosti',
                option.location,
                `Zdroj \`${impact.externalId}\`: ID domácnosti se skládá z ID obou postav seřazených abecedně — \`${swapped}\`, ne \`${impact.owner}\` (§4.2).`,
                { value: impact.owner, suggestion: swapped },
              )
            } else {
              issues.error(
                'neznamy_zdroj',
                option.location,
                `Zdroj \`${impact.externalId}\` neexistuje — v listu \`Resources\` není řádek vlastníka \`${impact.owner}\` se zdrojem \`${impact.key}\`.`,
                {
                  value: impact.externalId,
                  suggestion: suggestClosest(impact.externalId, [...resourceIds, ...jointIds]),
                },
              )
            }
          }
        }

        for (const blockId of option.blocks) {
          if (blockIds.has(blockId)) continue
          issues.error(
            'neznamy_blok',
            option.location,
            `Odpověď \`${option.externalId}\` zapíná blok \`${blockId}\`, který není v listu \`${chapter}_Content\`.`,
            { value: blockId, suggestion: suggestClosest(blockId, knownBlockIds) },
          )
        }

        for (const effect of option.effects) {
          if (CHARACTER_ARGUMENT_EFFECTS.includes(effect.name) && !characterIds.has(effect.argument)) {
            issues.error(
              'neznama_postava',
              option.location,
              `Efekt \`${effect.raw}\` u odpovědi \`${option.externalId}\` odkazuje na postavu \`${effect.argument}\`, která není v listu \`Characters\`.`,
              {
                value: effect.argument,
                suggestion: suggestClosest(effect.argument, knownCharacters),
              },
            )
          }
          if (GROUP_ARGUMENT_EFFECTS.includes(effect.name) && !groupIds.has(effect.argument)) {
            issues.error(
              'neznama_skupina',
              option.location,
              `Efekt \`${effect.raw}\` u odpovědi \`${option.externalId}\` odkazuje na skupinu \`${effect.argument}\`, která není v listu \`Groups\`.`,
              { value: effect.argument, suggestion: suggestClosest(effect.argument, knownGroups) },
            )
          }
        }
      }
    }
  }
}

/**
 * The same household written the other way round (§4.2).
 *
 * The ID is both members' IDs sorted alphabetically and glued together, so
 * `MirekMarie` is not an unknown owner — it is `MarieMirek` spelled backwards,
 * and saying so is worth more than "neexistuje".
 */
const householdOutOfOrder = (owner: string, characterIds: Set<string>): string | undefined => {
  for (const first of characterIds) {
    if (!owner.startsWith(first)) continue

    const second = owner.slice(first.length)
    if (!characterIds.has(second)) continue
    if (first.localeCompare(second, 'cs') <= 0) continue

    return `${second}${first}`
  }

  return undefined
}

/** Polls of the whole run, by ID; a vote may sit in the same sheet as its poll. */
const collectPolls = (config: ParsedConfig): Map<string, ParsedQuestion> => {
  const polls = new Map<string, ParsedQuestion>()
  for (const questions of config.questions.values()) {
    for (const question of questions) {
      if (question.type === 'poll') polls.set(question.externalId, question)
    }
  }

  return polls
}

const checkOwner = (
  question: ParsedQuestion,
  characterIds: Set<string>,
  knownCharacters: string[],
  issues: IssueCollector,
): void => {
  // A poll belongs to nobody on purpose (§6.6).
  if (question.type === 'poll') return
  if (question.characterId !== undefined && characterIds.has(question.characterId)) return

  issues.error(
    'neznama_postava',
    question.location,
    `Otázka \`${question.externalId}\` je vedená na postavu \`${question.characterRef}\`, která není v listu \`Characters\`.`,
    {
      value: question.characterRef,
      suggestion: suggestClosest(question.characterRef, knownCharacters),
    },
  )
}

/** §6.6: a vote whose poll does not exist has no text and no options to show. */
const checkPollReference = (
  question: ParsedQuestion,
  polls: Map<string, ParsedQuestion>,
  issues: IssueCollector,
): void => {
  if (question.type !== 'poll-answer') return
  if (question.pollRef === undefined || question.pollRef === '') return
  if (polls.has(question.pollRef)) return

  issues.error(
    'neznama_anketa',
    question.location,
    `Otázka \`${question.externalId}\` hlasuje v anketě \`${question.pollRef}\`, která v souboru není — anketa musí být řádek typu \`poll\` s vyplněným ID.`,
    { value: question.pollRef, suggestion: suggestClosest(question.pollRef, polls.keys()) },
  )
}
