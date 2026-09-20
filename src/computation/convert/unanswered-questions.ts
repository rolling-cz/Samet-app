import type { AskedQuestion } from '../types/asked-question'
import type { MissingAnswer } from '../types/missing-answer'

/** Asked and not answered. An answer is a row someone entered; there are no defaults (§6.3). */
export const unansweredQuestions = (
  asked: readonly AskedQuestion[],
  answeredQuestionIds: ReadonlySet<string>,
  chapter: number,
): MissingAnswer[] =>
  asked
    .filter((question) => !answeredQuestionIds.has(question.id))
    .map((question) => ({ questionId: question.externalId, characterId: question.characterExternalId, chapter }))
