import { FIRST_CHAPTER } from '@/db/constants/chapters'
import type { ChapterSummary } from '../types/chapter-summary'

/**
 * The chapter a run opens on: the first one not yet released — that is the one
 * being worked on — or the last one once everything is out.
 */
export const defaultChapterNumber = (chapters: readonly ChapterSummary[]): number => {
  const ordered = [...chapters].sort((a, b) => a.number - b.number)
  const current = ordered.find((chapter) => chapter.status !== 'released') ?? ordered.at(-1)

  return current?.number ?? FIRST_CHAPTER
}
