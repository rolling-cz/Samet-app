import { forRun } from '@/db'
import { questionnaireView } from '../convert/questionnaire-view'
import { loadEnteredAnswerRows, loadQuestionnaireRows } from '../services/load-questionnaire-rows'
import type { Questionnaire } from '../types/questionnaire-view'
import { askedQuestionsIn } from './load-asked-questions'
import { loadChapterContext } from './load-chapter-context'
import { loadStateBefore } from './load-state-before'

/**
 * Everything one character's questionnaire screen shows in chapter N: the
 * asked questions with their wording, options, `{input}` fields and stored
 * answers, and the state before the chapter. An unknown character is an
 * `UnknownIdError`.
 */
export const loadQuestionnaire = async (
  runId: string,
  chapter: number,
  characterExternalId: string,
): Promise<Questionnaire> => {
  const scope = forRun(runId)
  const context = await loadChapterContext(scope, chapter)
  if (context._type === 'blocked') return context

  const [asked, details, entered, state] = await Promise.all([
    askedQuestionsIn(scope, context),
    loadQuestionnaireRows(scope),
    loadEnteredAnswerRows(scope, context.chapterId),
    loadStateBefore(scope, context, chapter),
  ])

  return {
    _type: 'ready',
    questionnaire: questionnaireView(
      characterExternalId,
      asked,
      context.config,
      details,
      entered,
      state,
      context.directory,
    ),
  }
}
