import type { RunSection } from '@/core'
import { navigation } from '@/locales/cs/navigation'
import { PageNote } from '../PageNote/PageNote'

interface SectionPlaceholderProps {
  section: RunSection
  /** Absent for a section that belongs to the run, not to a chapter. */
  chapter?: number
}

/** A section whose screen comes in a later session; the navigation to it already stands (§6.4). */
export const SectionPlaceholder = ({ section, chapter }: SectionPlaceholderProps) => (
  <PageNote
    title={
      chapter === undefined
        ? navigation.sections[section]
        : navigation.sectionInChapter(navigation.sections[section], chapter)
    }
    body={navigation.sectionPlaceholders[section]}
    testId={`section-placeholder--${section}`}
  />
)
