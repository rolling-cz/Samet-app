import { notFound } from 'next/navigation'
import { loadChapterAvailability, type ChapterAvailability } from '@/computation'
import { parseChapterNumber } from '../utils/parse-chapter-number'
import { loadRunShell } from './load-run-shell'

export interface ChapterPage {
  runId: string
  chapter: number
  availability: ChapterAvailability
}

/**
 * What every screen under `/kapitola/<n>/` starts from. A chapter the run does
 * not have is not-found; one that cannot be opened yet is a page that says why.
 */
export const loadChapterPage = async (runId: string, chapterSegment: string): Promise<ChapterPage> => {
  const shell = await loadRunShell(runId)
  const chapter = parseChapterNumber(chapterSegment)
  if (!shell || chapter === undefined || !shell.chapters.some((row) => row.number === chapter)) notFound()

  return { runId: shell.run.id, chapter, availability: await loadChapterAvailability(shell.run.id, chapter) }
}
