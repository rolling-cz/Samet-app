import { navigation } from '@/locales/cs/navigation'
import { PageNote } from '../PageNote/PageNote'

interface ChapterBlockedProps {
  chapter: number
  /** The earlier chapter whose confirmed computation this one stands on. */
  missingChapter: number
}

/** The page exists and says what is missing — a chapter that cannot open yet is not a wrong address. */
export const ChapterBlocked = ({ chapter, missingChapter }: ChapterBlockedProps) => (
  <PageNote
    title={navigation.chapterBlockedTitle(chapter)}
    body={navigation.chapterBlockedBody(chapter, missingChapter)}
    testId={`chapter-blocked--${chapter}`}
  />
)
