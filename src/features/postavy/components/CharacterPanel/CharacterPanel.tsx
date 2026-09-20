/**
 * Left panel with the run's characters (§6.4). It lives in the run layout, above
 * the chapter in the route tree, so it stays mounted and keeps its scroll
 * position while the org moves between characters and chapters. Completion
 * indicators, search and the "only unfilled" filter come with answer entry.
 */
import Drawer from '@mui/material/Drawer'
import Typography from '@mui/material/Typography'
import { postavy } from '@/locales/cs/postavy'
import type { CharacterListItem } from '../../types/character-list-item'
import styles from './CharacterPanel.module.css'
import { CharacterLinks } from './components/CharacterLinks/CharacterLinks'

interface CharacterPanelProps {
  runId: string
  characters: CharacterListItem[]
  defaultChapter: number
}

export const CharacterPanel = ({ runId, characters, defaultChapter }: CharacterPanelProps) => (
  <Drawer
    variant="permanent"
    className={styles.drawer}
    slotProps={{ paper: { className: styles.paper } }}
    data-testid="character-panel"
  >
    <div className={styles.head}>
      <Typography variant="subtitle2" component="h2">
        {postavy.panelTitle}
      </Typography>
      <Typography variant="caption" className={styles.muted} data-testid="character-panel--count">
        {postavy.count(characters.length)}
      </Typography>
    </div>

    {characters.length === 0 ? (
      <Typography variant="body2" className={styles.empty}>
        {postavy.empty}
      </Typography>
    ) : (
      <CharacterLinks runId={runId} characters={characters} defaultChapter={defaultChapter} />
    )}
  </Drawer>
)
