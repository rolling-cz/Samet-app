import { compareIds } from '@/engine'
import type { ConfigRows } from '../types/config-rows'

type QuestionRow = ConfigRows['questions'][number]

const byCharacterAndOrdinal = (a: QuestionRow, b: QuestionRow): number =>
  compareIds(a.characterId ?? '', b.characterId ?? '') || (a.ordinal ?? 0) - (b.ordinal ?? 0)

/**
 * The questions of one chapter that are put to the org (§4.5): those without a
 * `Condition`, plus those whose variant was selected. A lookup, exactly as in
 * the engine's `gateQuestions` — a test holds the two together. A `poll` is
 * nobody's question; its `poll-answer`s are (§6.6).
 *
 * `selectedVariationIds` are database keys from the baseline computation of the
 * chapter before; chapter 1 has none and needs none.
 */
export const askedQuestions = (
  questions: readonly QuestionRow[],
  chapterId: string,
  selectedVariationIds: ReadonlySet<string>,
): QuestionRow[] =>
  questions
    .filter(
      (question) =>
        question.chapterId === chapterId &&
        question.type !== 'poll' &&
        (question.conditionVariationId === null || selectedVariationIds.has(question.conditionVariationId)),
    )
    .sort(byCharacterAndOrdinal)
