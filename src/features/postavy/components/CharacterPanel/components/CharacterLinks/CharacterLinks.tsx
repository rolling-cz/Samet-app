import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import { CompletionIcon } from '@/components'
import type { CharacterCompletion } from '@/computation'
import { chapterRoute, DEFAULT_CHAPTER_SECTION } from '@/core'
import { postavy } from '@/locales/cs/postavy'
import { statuses } from '@/locales/cs/statuses'
import type { CharacterListItem } from '../../../../types/character-list-item'
import styles from './CharacterLinks.module.css'

interface CharacterLinksProps {
  runId: string
  chapter: number
  /** Registry ID from the address. */
  selectedId: string | undefined
  characters: CharacterListItem[]
  completion: ReadonlyMap<string, CharacterCompletion>
}

const progressNote = (completion: CharacterCompletion): string =>
  completion.askedCount === 0 ? postavy.noQuestions : postavy.progress(completion.completeCount, completion.askedCount)

/** Each character opens in the chapter the org is looking at; the selection comes from the address. */
export const CharacterLinks = ({ runId, chapter, selectedId, characters, completion }: CharacterLinksProps) => {
  if (characters.length === 0) {
    return (
      <Typography variant="body2" className={styles.noMatch} data-testid="character-panel--no-match">
        {postavy.noMatch}
      </Typography>
    )
  }

  return (
    <List disablePadding>
      {characters.map((character) => {
        const state = completion.get(character.externalId)

        return (
          <ListItem key={character.id} disablePadding>
            <ListItemButton
              component={Link}
              href={chapterRoute(runId, chapter, DEFAULT_CHAPTER_SECTION, character.externalId)}
              className={styles.link}
              aria-current={character.externalId === selectedId ? 'page' : undefined}
              data-selected={character.externalId === selectedId}
              data-testid={`character-panel--${character.externalId}`}
            >
              {state && (
                <CompletionIcon
                  status={state.status}
                  label={statuses.completion[state.status]}
                  testId={`character-completion--${character.externalId}`}
                />
              )}
              <ListItemText primary={postavy.fullName(character.firstName, character.lastName)} />
              {state && (
                <Typography variant="caption" className={styles.progress}>
                  {progressNote(state)}
                </Typography>
              )}
            </ListItemButton>
          </ListItem>
        )
      })}
    </List>
  )
}
