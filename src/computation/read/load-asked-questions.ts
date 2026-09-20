import { eq } from 'drizzle-orm'
import { forRun, type RunScope } from '@/db'
import { selectedVariations } from '@/db/schema'
import { askedQuestions } from '../convert/asked-questions'
import type { AskedQuestion, AskedQuestions } from '../types/asked-question'
import { loadChapterContext, type ChapterContext } from './load-chapter-context'

type OpenChapter = Extract<ChapterContext, { _type: 'open' }>

const NO_VARIANTS: ReadonlySet<string> = Object.freeze(new Set<string>())

const selectedVariationIds = async (scope: RunScope, baselineId: string | undefined): Promise<ReadonlySet<string>> => {
  if (baselineId === undefined) return NO_VARIANTS

  const rows = await scope.selectColumns(
    selectedVariations,
    { blockVariationId: selectedVariations.blockVariationId },
    eq(selectedVariations.computationId, baselineId),
  )

  return new Set(rows.map((row) => row.blockVariationId))
}

export const askedQuestionsIn = async (scope: RunScope, context: OpenChapter): Promise<AskedQuestion[]> => {
  const selected = await selectedVariationIds(scope, context.baselineId)
  const asked: AskedQuestion[] = []

  for (const question of askedQuestions(context.config.questions, context.chapterId, selected)) {
    if (question.characterId === null) continue
    asked.push({ ...question, characterExternalId: context.directory.characters.toExternal(question.characterId) })
  }

  return asked
}

/**
 * The questions asked in chapter N, optionally one character's (workbook ID).
 * The questionnaire reads them here and never assembles them itself.
 */
export const loadAskedQuestions = async (
  runId: string,
  chapter: number,
  characterExternalId?: string,
): Promise<AskedQuestions> => {
  const scope = forRun(runId)
  const context = await loadChapterContext(scope, chapter)
  if (context._type === 'blocked') return context

  const questions = await askedQuestionsIn(scope, context)

  return {
    _type: 'ready',
    questions:
      characterExternalId === undefined
        ? questions
        : questions.filter((question) => question.characterExternalId === characterExternalId),
  }
}
