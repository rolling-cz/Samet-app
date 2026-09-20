import Button from '@mui/material/Button'
import Link from 'next/link'
import { chapterRoute, DEFAULT_CHAPTER_SECTION } from '@/core'
import { dotaznik } from '@/locales/cs/dotaznik'
import type { CharacterNeighbours } from '../../../../types/character-neighbours'
import styles from './CharacterNav.module.css'

interface CharacterNavProps {
  runId: string
  chapter: number
  neighbours: CharacterNeighbours
}

type NavTarget = { key: keyof CharacterNeighbours; label: string }

const TARGETS: readonly NavTarget[] = Object.freeze([
  { key: 'previous', label: dotaznik.previous },
  { key: 'next', label: dotaznik.next },
  { key: 'nextUnfilled', label: dotaznik.nextUnfilled },
])

/** The pile of papers goes in the panel's order; a disabled button marks its end. */
export const CharacterNav = ({ runId, chapter, neighbours }: CharacterNavProps) => (
  <nav className={styles.nav} aria-label={dotaznik.navigationLabel}>
    {TARGETS.map(({ key, label }) => {
      const characterId = neighbours[key]

      return characterId === undefined ? (
        <Button key={key} variant="outlined" disabled data-testid={`character-nav--${key}`}>
          {label}
        </Button>
      ) : (
        <Button
          key={key}
          component={Link}
          href={chapterRoute(runId, chapter, DEFAULT_CHAPTER_SECTION, characterId)}
          variant={key === 'nextUnfilled' ? 'contained' : 'outlined'}
          data-testid={`character-nav--${key}`}
        >
          {label}
        </Button>
      )
    })}
  </nav>
)
