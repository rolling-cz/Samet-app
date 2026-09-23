'use client'

import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import type { Route } from 'next'
import Link from 'next/link'
import { chapterRoute } from '@/core'
import { vystupy } from '@/locales/cs/vystupy'
import { OUTPUT_TABS, TAB_PARAM, type OutputTab } from '../../constants/tabs'
import type { OutputsView } from '../../types/outputs-view'
import { DocumentsTab } from '../DocumentsTab/DocumentsTab'
import { OverviewTab } from '../OverviewTab/OverviewTab'
import styles from './OutputsScreen.module.css'

interface OutputsScreenProps {
  view: OutputsView
  tab: OutputTab
}

/** Two tabs over one computation (§6.4): what the state is, and what gets printed from it. */
export const OutputsScreen = ({ view, tab }: OutputsScreenProps) => {
  const base = chapterRoute(view.runId, view.chapter, 'vystupy')

  return (
    <section className={styles.screen} data-testid="outputs">
      <header className={styles.head}>
        <Typography variant="h5" component="h1">
          {vystupy.title(view.chapter, view.documentChapter)}
        </Typography>
        <Typography variant="body2" className={styles.basis} data-testid="outputs--basis">
          {vystupy.basis(view.chapter, view.computationVersion)}
        </Typography>
      </header>
      <Tabs value={tab} className={styles.tabs}>
        {OUTPUT_TABS.map((value) => (
          <Tab
            key={value}
            value={value}
            label={vystupy.tabs[value]}
            component={Link}
            href={`${base}?${TAB_PARAM}=${value}` as Route}
            scroll={false}
            data-testid={`outputs--tab-${value}`}
          />
        ))}
      </Tabs>
      {tab === 'prehled' ? <OverviewTab view={view} /> : <DocumentsTab view={view} />}
    </section>
  )
}
