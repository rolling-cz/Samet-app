import type { ChapterSummary } from '../types/chapter-summary'

/** The run's last chapter; Výstupy stop before it (`chapterHasSection`). */
export const lastChapterNumber = (chapters: readonly Pick<ChapterSummary, 'number'>[]): number =>
  Math.max(0, ...chapters.map((chapter) => chapter.number))
