/**
 * Top bar on every screen (§6.4): run switcher, run and chapter states, the
 * five sections and the „Kdo jsi?" name. Its colour comes from `RunThemeRoot`,
 * because confusing two runs is the one mistake the data model cannot undo.
 */
import AppBar from '@mui/material/AppBar'
import Chip from '@mui/material/Chip'
import Toolbar from '@mui/material/Toolbar'
import Link from 'next/link'
import { defaultChapterNumber, HOME_ROUTE, lastChapterNumber, type ChapterSummary } from '@/core'
import type { RunSummary } from '@/db'
import { common } from '@/locales/cs/common'
import { navigation } from '@/locales/cs/navigation'
import { statuses } from '@/locales/cs/statuses'
import styles from './AppHeader.module.css'
import { ChapterStatuses } from './components/ChapterStatuses/ChapterStatuses'
import { IdentityMenu } from './components/IdentityMenu/IdentityMenu'
import { RunSwitcher } from './components/RunSwitcher/RunSwitcher'
import { SectionNav } from './components/SectionNav/SectionNav'

interface AppHeaderProps {
  /** Absent on the run list, before a run is chosen. */
  run?: RunSummary
  runs: RunSummary[]
  chapters?: ChapterSummary[]
  author: string
}

export const AppHeader = ({ run, runs, chapters = [], author }: AppHeaderProps) => {
  const lastChapter = lastChapterNumber(chapters)

  return (
  <AppBar position="static" className={styles.header} data-testid="app-header">
    <Toolbar className={styles.toolbar}>
      <Link href={HOME_ROUTE} className={styles.brand} data-testid="app-header--home">
        {common.appShortTitle}
      </Link>

      <RunSwitcher runs={runs} runId={run?.id} />

      {run && (
        <Chip
          variant="outlined"
          label={navigation.runStatus(statuses.run[run.status])}
          className={styles.status}
          data-status={run.status}
          data-testid="app-header--run-status"
        />
      )}

      {run && chapters.length > 0 && <ChapterStatuses runId={run.id} chapters={chapters} lastChapter={lastChapter} />}

      <span className={styles.spacer} />

      <IdentityMenu author={author} />
    </Toolbar>

    {run && (
      <SectionNav
        runId={run.id}
        defaultChapter={defaultChapterNumber(chapters)}
        lastChapter={lastChapter}
      />
    )}
  </AppBar>
  )
}
