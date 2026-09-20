'use client'

import Button from '@mui/material/Button'
import Link from 'next/link'
import { chapterRoute } from '@/core'
import { navigation } from '@/locales/cs/navigation'
import { PageNote } from '../PageNote/PageNote'

interface ChapterBlockedProps {
  runId: string
  chapter: number
  /** The earlier chapter whose confirmed computation this one stands on. */
  missingChapter: number
}

/**
 * The page exists and says what is missing — a chapter that cannot open yet is
 * not a wrong address. Never a list of „all questions" instead: without the
 * baseline there is no telling which are asked (§4.5).
 */
export const ChapterBlocked = ({ runId, chapter, missingChapter }: ChapterBlockedProps) => (
  <PageNote
    title={navigation.chapterBlockedTitle(chapter)}
    body={navigation.chapterBlockedBody(chapter, missingChapter)}
    testId={`chapter-blocked--${chapter}`}
    action={
      <Button
        component={Link}
        href={chapterRoute(runId, missingChapter, 'prepocet')}
        variant="outlined"
        data-testid="chapter-blocked--recompute"
      >
        {navigation.chapterBlockedAction(missingChapter)}
      </Button>
    }
  />
)
