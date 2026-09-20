'use client'

/**
 * Left panel with the run's characters (§6.4). It lives in the run layout, above
 * the chapter in the route tree, so it stays mounted and keeps its scroll
 * position while the org moves between characters and chapters.
 */
import Drawer from '@mui/material/Drawer'
import Typography from '@mui/material/Typography'
import { useMemo } from 'react'
import { completionSummary } from '@/computation/convert/completion-summary'
import { useChapterCompletion } from '@/core/hooks/useChapterCompletion'
import { useRunLocation } from '@/core/hooks/useRunLocation'
import { postavy } from '@/locales/cs/postavy'
import { usePanelFilter } from '../../hooks/usePanelFilter'
import type { CharacterListItem } from '../../types/character-list-item'
import { filterCharacters } from '../../utils/filter-characters'
import styles from './CharacterPanel.module.css'
import { CharacterLinks } from './components/CharacterLinks/CharacterLinks'
import { PanelFilter } from './components/PanelFilter/PanelFilter'

interface CharacterPanelProps {
  runId: string
  characters: CharacterListItem[]
  /** Chapter the panel shows on a screen without one (Správa). */
  defaultChapter: number
}

export const CharacterPanel = ({ runId, characters, defaultChapter }: CharacterPanelProps) => {
  const location = useRunLocation()
  const chapter = location.chapter ?? defaultChapter
  const { characters: completion, byCharacter } = useChapterCompletion(chapter)
  const { query, onlyUnfilled, handleQuery, handleOnlyUnfilled } = usePanelFilter()

  const summary = useMemo(() => completionSummary(completion), [completion])

  const shown = useMemo(
    () => filterCharacters(characters, query, onlyUnfilled, (characterId) => byCharacter.get(characterId)?.status),
    [characters, query, onlyUnfilled, byCharacter],
  )

  return (
    <Drawer
      variant="permanent"
      className={styles.drawer}
      slotProps={{ paper: { className: styles.paper } }}
      data-testid="character-panel"
    >
      <div className={styles.head}>
        <div className={styles.title}>
          <Typography variant="subtitle2" component="h2">
            {postavy.panelTitle}
          </Typography>
          <Typography variant="caption" className={styles.muted} data-testid="character-panel--summary">
            {completion.length === 0
              ? postavy.summaryUnavailable(characters.length)
              : postavy.summary(summary.done, summary.total)}
          </Typography>
        </div>
        {characters.length > 0 && (
          <PanelFilter
            query={query}
            onlyUnfilled={onlyUnfilled}
            onQuery={handleQuery}
            onOnlyUnfilled={handleOnlyUnfilled}
          />
        )}
      </div>

      {characters.length === 0 ? (
        <Typography variant="body2" className={styles.empty}>
          {postavy.empty}
        </Typography>
      ) : (
        <CharacterLinks
          runId={runId}
          chapter={chapter}
          selectedId={location.characterId}
          characters={shown}
          completion={byCharacter}
        />
      )}
    </Drawer>
  )
}
