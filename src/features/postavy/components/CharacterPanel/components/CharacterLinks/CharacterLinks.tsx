'use client'

import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Link from 'next/link'
import { chapterRoute, DEFAULT_CHAPTER_SECTION } from '@/core'
import { useRunLocation } from '@/core/hooks/useRunLocation'
import { postavy } from '@/locales/cs/postavy'
import type { CharacterListItem } from '../../../../types/character-list-item'
import styles from './CharacterLinks.module.css'

interface CharacterLinksProps {
  runId: string
  characters: CharacterListItem[]
  /** Chapter the links use on a screen without one (Správa). */
  defaultChapter: number
}

/** Each character opens in the chapter the org is looking at; the selection comes from the address. */
export const CharacterLinks = ({ runId, characters, defaultChapter }: CharacterLinksProps) => {
  const location = useRunLocation()

  const chapter = location.chapter ?? defaultChapter

  return (
    <List disablePadding>
      {characters.map((character) => (
        <ListItem key={character.id} disablePadding>
          <ListItemButton
            component={Link}
            href={chapterRoute(runId, chapter, DEFAULT_CHAPTER_SECTION, character.externalId)}
            className={styles.link}
            aria-current={character.externalId === location.characterId ? 'page' : undefined}
            data-selected={character.externalId === location.characterId}
            data-testid={`character-panel--${character.externalId}`}
          >
            <ListItemText primary={postavy.fullName(character.firstName, character.lastName)} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  )
}
