import { forRun } from '@/db'
import type { ChapterAvailability } from '../types/chapter-availability'
import { loadChapterContext } from './load-chapter-context'

/** Can chapter N be opened — for its questionnaire as much as for its computation? */
export const loadChapterAvailability = async (runId: string, chapter: number): Promise<ChapterAvailability> => {
  const context = await loadChapterContext(forRun(runId), chapter)

  return context._type === 'open' ? { _type: 'open' } : context
}
