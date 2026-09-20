import { forRun } from '@/db'
import { characterStateView } from '../convert/character-state-view'
import { initialStateFromRows } from '../convert/initial-state-from-rows'
import { snapshotToState } from '../convert/snapshot-to-state'
import { loadSnapshotRows } from '../services/load-baseline'
import type { CharacterStateView } from '../types/character-state-view'
import { loadChapterContext } from './load-chapter-context'

export type CharacterStateBefore =
  | { _type: 'ready'; state: CharacterStateView }
  | { _type: 'blocked'; missingChapter: number }

/**
 * A character's state before chapter N: the config's starting values for
 * chapter 1, the baseline snapshot of chapter N−1 after that (§4.3).
 */
export const loadCharacterState = async (
  runId: string,
  chapter: number,
  characterExternalId: string,
): Promise<CharacterStateBefore> => {
  const scope = forRun(runId)
  const context = await loadChapterContext(scope, chapter)
  if (context._type === 'blocked') return context

  const { config, directory, baselineId } = context
  const state =
    baselineId === undefined
      ? initialStateFromRows(config, directory)
      : snapshotToState(await loadSnapshotRows(scope, baselineId), chapter - 1, directory)

  return { _type: 'ready', state: characterStateView(state, characterExternalId, config, directory) }
}
