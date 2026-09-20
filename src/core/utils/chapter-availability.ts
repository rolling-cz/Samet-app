import { FIRST_CHAPTER } from '@/db/constants/chapters'
import type { ChapterAvailability } from '../types/chapter-availability'
import type { ChapterSummary } from '../types/chapter-summary'

const OPEN: ChapterAvailability = Object.freeze({ _type: 'open' })

/**
 * Stand-in until the computation core decides from the computations themselves
 * (released, else the last confirmed one): a chapter's status only turns
 * `computed` on a confirmed computation, so it says the same for now.
 */
export const chapterAvailability = (chapters: readonly ChapterSummary[], chapter: number): ChapterAvailability => {
  if (chapter <= FIRST_CHAPTER) return OPEN

  const previousNumber = chapter - 1
  const previous = chapters.find((candidate) => candidate.number === previousNumber)
  if (previous !== undefined && previous.status !== 'in_progress') return OPEN

  return { _type: 'blocked', missingChapter: previousNumber }
}
