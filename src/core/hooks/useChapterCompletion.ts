'use client'

import { useContext, useMemo } from 'react'
import type { CharacterCompletion } from '@/computation'
import { CompletionContext } from '../providers/completion-context'

const NO_CHARACTERS: readonly CharacterCompletion[] = Object.freeze([])

/** One chapter's completion, plus a lookup by registry ID. Empty for a chapter that cannot open yet. */
export const useChapterCompletion = (chapter: number | undefined) => {
  const completion = useContext(CompletionContext)

  const characters = (chapter === undefined ? undefined : completion[chapter]) ?? NO_CHARACTERS

  const byCharacter = useMemo(
    () => new Map(characters.map((character) => [character.characterId, character])),
    [characters],
  )

  return { characters, byCharacter }
}
