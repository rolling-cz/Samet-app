/**
 * Left panel with the run's characters (§6.4). It lives in the run layout, so it
 * keeps its scroll position while the org moves between screens. Completion
 * indicators, search and the "only unfilled" filter come with answer entry.
 */
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import { postavy } from '@/locales/cs/postavy'
import type { CharacterListItem } from '../../types/character-list-item'
import styles from './CharacterPanel.module.css'

export const CharacterPanel = ({ characters }: { characters: CharacterListItem[] }) => (
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
      <List disablePadding>
        {characters.map((character) => (
          <ListItem key={character.id} data-testid={`character-panel--${character.externalId}`}>
            <ListItemText primary={postavy.fullName(character.firstName, character.lastName)} />
          </ListItem>
        ))}
      </List>
    )}
  </Drawer>
)
