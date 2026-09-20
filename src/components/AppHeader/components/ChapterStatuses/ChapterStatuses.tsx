'use client'

import Chip from '@mui/material/Chip'
import Link from 'next/link'
import { ADMIN_SECTION, chapterRoute, DEFAULT_CHAPTER_SECTION, type ChapterSummary } from '@/core'
import { useRunLocation } from '@/core/hooks/useRunLocation'
import { navigation } from '@/locales/cs/navigation'
import { statuses } from '@/locales/cs/statuses'
import styles from './ChapterStatuses.module.css'

interface ChapterStatusesProps {
  runId: string
  chapters: ChapterSummary[]
}

/** Switching the chapter keeps the section and the selected character. */
export const ChapterStatuses = ({ runId, chapters }: ChapterStatusesProps) => {
  const location = useRunLocation()

  // Správa has no chapter, so from there a chapter opens on the default section.
  const section =
    location.section === undefined || location.section === ADMIN_SECTION ? DEFAULT_CHAPTER_SECTION : location.section

  return (
    <ul className={styles.list} aria-label={navigation.chaptersLabel} data-testid="chapter-statuses">
      {chapters.map((chapter) => (
        <li key={chapter.number}>
          <Chip
            component={Link}
            href={chapterRoute(runId, chapter.number, section, location.characterId)}
            clickable
            variant="outlined"
            label={navigation.chapter(chapter.number, statuses.chapter[chapter.status], chapter.isTouched)}
            className={styles.chip}
            aria-current={chapter.number === location.chapter ? 'page' : undefined}
            data-current={chapter.number === location.chapter}
            data-status={chapter.status}
            data-touched={chapter.isTouched}
            data-testid={`chapter-status--${chapter.number}`}
          />
        </li>
      ))}
    </ul>
  )
}
