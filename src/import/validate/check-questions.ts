import { MISSING_POLL_ID_PREFIX } from '../constants/question-ids'
import type { IssueCollector } from '../issue-collector'
import type { ParsedConfig } from '../types/parsed-config'
import type { ParsedAnswerOption, ParsedQuestion } from '../types/parsed-question'
import { householdExternalId } from '@/engine'
import { splitHouseholdId } from '../utils/household-id'
import { suggestClosest } from '../utils/suggest-closest'
import { householdResourceIds, knownResourceIds, knownScaleIds } from './known-scale-ids'

export const checkQuestions = (
  config: ParsedConfig,
  characterIds: Set<string>,
  issues: IssueCollector,
): void => {
  const knownCharacters = [...characterIds]
  const scaleIds = knownScaleIds(config)
  const resourceIds = knownResourceIds(config)
  const jointIds = householdResourceIds(config)
  const polls = collectPolls(config)

  for (const [chapter, questions] of config.questions) {
    const blockIds = new Set((config.blocks.get(chapter) ?? []).map((b) => b.externalId))
    const knownBlockIds = [...blockIds]
    const votedPollIds = new Set(questions.map((question) => question.pollRef))
    for (const question of questions) {
      checkOwner(question, characterIds, knownCharacters, issues)
      checkPollReference(question, polls, issues)
      checkPollHasVoters(question, chapter, votedPollIds, issues)

      for (const option of question.options) {
        for (const impact of option.impacts) {
          if (impact.kind === 'scale' && !scaleIds.has(impact.externalId)) {
            issues.error(
              'unknown_scale',
              option.location,
              `Škála \`${impact.externalId}\` neexistuje — v listu \`Scales\` není řádek postavy \`${impact.owner}\` se škálou \`${impact.key}\`.`,
              { value: impact.externalId, suggestion: suggestClosest(impact.externalId, scaleIds) },
            )
          }
          if (
            impact.kind === 'resource' &&
            !resourceIds.has(impact.externalId) &&
            !jointIds.has(impact.externalId)
          ) {
            const swapped = householdOutOfOrder(impact.owner, characterIds)
            if (swapped) {
              issues.error(
                'household_order',
                option.location,
                `Zdroj \`${impact.externalId}\`: ID domácnosti se skládá z ID obou postav seřazených abecedně — \`${swapped}\`, ne \`${impact.owner}\` (§4.2).`,
                { value: impact.owner, suggestion: swapped },
              )
            } else {
              issues.error(
                'unknown_resource',
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
            'unknown_block',
            option.location,
            `Odpověď \`${option.externalId}\` zapíná blok \`${blockId}\`, který není v listu \`${chapter}_Content\`.`,
            { value: blockId, suggestion: suggestClosest(blockId, knownBlockIds) },
          )
        }

        checkEffects(option, characterIds, knownCharacters, issues)
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
  const members = splitHouseholdId(owner, characterIds)
  if (!members) return undefined

  const correct = householdExternalId(members[0], members[1])

  return correct === owner ? undefined : correct
}

/**
 * The `Effects` column's arguments (§11, bod 10). The syntax is settled by the
 * parser; what is left is whether the two IDs name two different characters the
 * registry knows — a household of one, or of somebody who does not exist, is
 * not something the engine can be asked to decide.
 */
const checkEffects = (
  option: ParsedAnswerOption,
  characterIds: Set<string>,
  knownCharacters: string[],
  issues: IssueCollector,
): void => {
  for (const effect of option.effects) {
    for (const argument of effect.args) {
      if (characterIds.has(argument)) continue
      issues.error(
        'unknown_character',
        effect.location,
        `Efekt \`${effect.raw}\` u odpovědi \`${option.externalId}\` odkazuje na postavu \`${argument}\`, která není v listu \`Characters\`.`,
        { value: argument, suggestion: suggestClosest(argument, knownCharacters) },
      )
    }

    const [first, second] = effect.args
    if (first === undefined || second !== first) continue
    issues.error(
      'invalid_effect',
      effect.location,
      `Efekt \`${effect.raw}\` u odpovědi \`${option.externalId}\` jmenuje dvakrát tutéž postavu — domácnost tvoří dvě různé postavy.`,
      { value: first },
    )
  }
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
    'unknown_character',
    question.location,
    `Otázka \`${question.externalId}\` je vedená na postavu \`${question.characterRef}\`, která není v listu \`Characters\`.`,
    {
      value: question.characterRef,
      suggestion: suggestClosest(question.characterRef, knownCharacters),
    },
  )
}

/**
 * §6.6: with nobody to vote, the first row would win on zero votes and its
 * effects would apply — a result no player chose.
 */
const checkPollHasVoters = (
  question: ParsedQuestion,
  chapter: number,
  votedPollIds: Set<string | undefined>,
  issues: IssueCollector,
): void => {
  // Nobody can vote in a poll without an ID; that one is reported already.
  if (question.type !== 'poll' || question.externalId.startsWith(MISSING_POLL_ID_PREFIX)) return
  if (votedPollIds.has(question.externalId)) return

  issues.error(
    'poll_without_votes',
    question.location,
    `V anketě \`${question.externalId}\` nikdo nehlasuje — v listu \`${chapter}_Questions\` není žádná otázka typu \`poll-answer\`, která by ve sloupci \`Text\` měla její ID. Bez hlasů by vyhrál první řádek a jeho efekty by se aplikovaly.`,
    { value: question.externalId },
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
    'unknown_poll',
    question.location,
    `Otázka \`${question.externalId}\` hlasuje v anketě \`${question.pollRef}\`, která v souboru není — anketa musí být řádek typu \`poll\` s vyplněným ID.`,
    { value: question.pollRef, suggestion: suggestClosest(question.pollRef, polls.keys()) },
  )
}
