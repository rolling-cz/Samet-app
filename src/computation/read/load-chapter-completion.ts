import { forRun } from '@/db'
import { chapterCompletion } from '../convert/chapter-completion'
import { inputKeysByOption } from '../convert/input-keys-by-option'
import { loadEnteredAnswerRows, loadQuestionnaireRows } from '../services/load-questionnaire-rows'
import type { ChapterCompletion } from '../types/completion'
import { askedQuestionsIn } from './load-asked-questions'
import { loadChapterContext } from './load-chapter-context'

/** Completion of every character in chapter N — one pass per chapter, never a query per character (§6.4). */
export const loadChapterCompletion = async (runId: string, chapter: number): Promise<ChapterCompletion> => {
  const scope = forRun(runId)
  const context = await loadChapterContext(scope, chapter)
  if (context._type === 'blocked') return context

  const [asked, details, entered] = await Promise.all([
    askedQuestionsIn(scope, context),
    loadQuestionnaireRows(scope),
    loadEnteredAnswerRows(scope, context.chapterId),
  ])

  return {
    _type: 'ready',
    characters: chapterCompletion(
      context.directory.characters.allExternal(),
      asked,
      context.config,
      inputKeysByOption(details),
      entered,
    ),
  }
}
