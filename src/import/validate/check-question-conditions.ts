/**
 * The `Condition` column of `N_Questions` (§4.5, §11 check 6i).
 *
 * It is not an expression. Expressions are evaluated in `N_Content` only; a
 * question names the one variant it waits for, and that variant has to be the
 * same character's, in the same chapter's content sheet (`2_Content` decides
 * about `2_Questions`).
 */
import { ANSWER_PREFIX, DEFAULT_CONDITION, RANDOM_FUNCTION, RESOURCE_PREFIX, SCALE_PREFIX } from '@/engine'
import { chapterSheetName } from '../constants/sheets'
import type { IssueCollector } from '../issue-collector'
import type { ParsedBlock } from '../types/parsed-block'
import type { ParsedConfig } from '../types/parsed-config'
import type { ParsedQuestion, ParsedQuestionCondition } from '../types/parsed-question'
import { suggestClosest } from '../utils/suggest-closest'
import { variationBlocks } from './variation-index'

/** One bare identifier: no operators, spaces, parentheses or calls. */
const SINGLE_IDENTIFIER = /^[\p{L}\p{N}_]+$/u

/** Prefixes of IDs that belong into an expression, never into `Condition` (§4.2). */
const EXPRESSION_ID_PREFIXES = Object.freeze([ANSWER_PREFIX, SCALE_PREFIX, RESOURCE_PREFIX])

/** Why the cell cannot be a `Variation ID`, in the author's terms. */
const notVariationReason = (raw: string, contentSheet: string): string | undefined => {
  if (raw === DEFAULT_CONDITION) {
    return `\`${DEFAULT_CONDITION}\` tu nemá smysl — prázdná buňka znamená, že se otázka položí vždy`
  }
  if (raw.includes(RANDOM_FUNCTION)) {
    return `\`${RANDOM_FUNCTION}\` smí jen ve sloupci \`Conditions\` v listu \`${contentSheet}\`; hod se ukládá k variantě bloku, otázka ho nemá kam uložit`
  }
  if (!SINGLE_IDENTIFIER.test(raw)) {
    return `je to výraz — ten patří do sloupce \`Conditions\` u varianty bloku v listu \`${contentSheet}\` a otázka se naváže na tu variantu`
  }

  const prefix = EXPRESSION_ID_PREFIXES.find((candidate) => raw.startsWith(candidate))
  if (prefix === undefined) return undefined

  return prefix === ANSWER_PREFIX
    ? `je to ID odpovědi — podmínku s ní napište do \`Conditions\` u varianty bloku v listu \`${contentSheet}\` a otázku navažte na tu variantu`
    : `je to ID škály nebo zdroje — porovnání patří do \`Conditions\` u varianty bloku v listu \`${contentSheet}\``
}

const ownerLabel = (block: ParsedBlock): string => block.characterId ?? block.groupId ?? block.ownerRef

const checkCondition = (
  question: ParsedQuestion,
  condition: ParsedQuestionCondition,
  variations: Map<string, ParsedBlock>,
  issues: IssueCollector,
): void => {
  const contentSheet = chapterSheetName(question.chapter, 'Content')
  const block = variations.get(condition.raw)

  if (!block) {
    const reason = notVariationReason(condition.raw, contentSheet)
    if (reason !== undefined) {
      issues.error(
        'question_condition_not_variation',
        condition.location,
        `Podmínka otázky \`${question.externalId}\` musí být jediné \`Variation ID\` nebo prázdná buňka: ${reason}.`,
        { value: condition.raw },
      )

      return
    }

    issues.error(
      'unknown_variation',
      condition.location,
      `Podmínka otázky \`${question.externalId}\` odkazuje na variantu \`${condition.raw}\`, která v listu \`${contentSheet}\` není — o otázkách kapitoly ${question.chapter} rozhoduje jen \`${contentSheet}\`.`,
      { value: condition.raw, suggestion: suggestClosest(condition.raw, variations.keys()) },
    )

    return
  }

  // An owner that matched nobody is already reported; a poll belongs to nobody
  // on purpose (§6.6), so no variant can be "its own".
  if (question.type !== 'poll' && question.characterId === undefined) return
  if (block.characterId !== undefined && block.characterId === question.characterId) return

  issues.error(
    'foreign_variation',
    condition.location,
    `Podmínka otázky \`${question.externalId}\` odkazuje na variantu \`${condition.raw}\`, která patří \`${ownerLabel(block)}\`, ne \`${question.characterId ?? question.characterRef}\` — otázka se smí vázat jen na variantu téže postavy.`,
    { value: condition.raw },
  )
}

export const checkQuestionConditions = (config: ParsedConfig, issues: IssueCollector): void => {
  for (const [chapter, questions] of config.questions) {
    const variations = variationBlocks(config.blocks.get(chapter) ?? [])

    for (const question of questions) {
      if (question.condition) checkCondition(question, question.condition, variations, issues)
    }
  }
}

/**
 * Blocks a `Condition` points at (§8.2). Such a block has no marker anywhere
 * and empty texts, and is still in use — it decides a question. A reference
 * from the wrong character counts too: that mistake is reported where it is.
 */
export const blocksDecidingQuestions = (config: ParsedConfig): Set<string> => {
  const blockIds = new Set<string>()

  for (const [chapter, questions] of config.questions) {
    const variations = variationBlocks(config.blocks.get(chapter) ?? [])
    for (const question of questions) {
      const block = question.condition ? variations.get(question.condition.raw) : undefined
      if (block) blockIds.add(block.externalId)
    }
  }

  return blockIds
}
