import { forRun } from '@/db'
import { characterStateView } from '../convert/character-state-view'
import type { CharacterStateView } from '../types/character-state-view'
import { loadChapterContext } from './load-chapter-context'
import { loadStateBefore } from './load-state-before'

export type CharacterStateBefore =
  | { _type: 'ready'; state: CharacterStateView }
  | { _type: 'blocked'; missingChapter: number }

/** A character's state before chapter N (§4.3). */
export const loadCharacterState = async (
  runId: string,
  chapter: number,
  characterExternalId: string,
): Promise<CharacterStateBefore> => {
  const scope = forRun(runId)
  const context = await loadChapterContext(scope, chapter)
  if (context._type === 'blocked') return context

  const state = await loadStateBefore(scope, context, chapter)

  return { _type: 'ready', state: characterStateView(state, characterExternalId, context.config, context.directory) }
}
