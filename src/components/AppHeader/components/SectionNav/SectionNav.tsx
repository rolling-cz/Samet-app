'use client'

import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Link from 'next/link'
import { ADMIN_SECTION, chapterHasSection, RUN_SECTIONS, sectionRoute } from '@/core'
import { useRunLocation } from '@/core/hooks/useRunLocation'
import { navigation } from '@/locales/cs/navigation'
import styles from './SectionNav.module.css'

interface SectionNavProps {
  runId: string
  /** Where a chapter section leads from Správa, which has no chapter of its own. */
  defaultChapter: number
  /** Výstupy of the last chapter would print documents for a chapter that does not exist. */
  lastChapter: number
}

/** The five sections (§6.4); links, so a section opens in a new tab like any page. Switching keeps the chapter. */
export const SectionNav = ({ runId, defaultChapter, lastChapter }: SectionNavProps) => {
  const location = useRunLocation()

  const chapter = location.chapter ?? defaultChapter
  const sections = RUN_SECTIONS.filter(
    (section) => section === ADMIN_SECTION || chapterHasSection(section, chapter, lastChapter),
  )
  const current = location.section !== undefined && (sections as readonly string[]).includes(location.section) ? location.section : false

  return (
    <nav aria-label={navigation.sectionsLabel} className={styles.nav}>
      <Tabs
        value={current}
        textColor="inherit"
        variant="scrollable"
        scrollButtons={false}
        slotProps={{ indicator: { className: styles.indicator } }}
      >
        {sections.map((section) => (
          <Tab
            key={section}
            value={section}
            label={navigation.sections[section]}
            component={Link}
            href={sectionRoute(runId, section, chapter)}
            data-testid={`section-nav--${section}`}
          />
        ))}
      </Tabs>
    </nav>
  )
}
