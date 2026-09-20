import { eq } from 'drizzle-orm'
import { forRun } from '@/db'
import { answers } from '@/db/schema'
import { unansweredQuestions } from '../convert/unanswered-questions'
import type { MissingAnswer } from '../types/missing-answer'
import { askedQuestionsIn } from './load-asked-questions'
import { loadChapterContext } from './load-chapter-context'

export type ComputationBlockers =
  | { _type: 'ready'; missingAnswers: MissingAnswer[] }
  | { _type: 'blocked'; missingChapter: number }

/** What keeps chapter N from being computed: its asked questions nobody answered, per character. */
export const loadComputationBlockers = async (runId: string, chapter: number): Promise<ComputationBlockers> => {
  const scope = forRun(runId)
  const context = await loadChapterContext(scope, chapter)
  if (context._type === 'blocked') return context

  const answered = await scope.selectColumns(answers, { questionId: answers.questionId }, eq(answers.chapterId, context.chapterId))

  return {
    _type: 'ready',
    missingAnswers: unansweredQuestions(
      await askedQuestionsIn(scope, context),
      new Set(answered.map((row) => row.questionId)),
      chapter,
    ),
  }
}
