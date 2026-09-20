import type { RunScope } from '@/db'
import type { RunState } from '@/engine'
import { initialStateFromRows } from '../convert/initial-state-from-rows'
import { snapshotToState } from '../convert/snapshot-to-state'
import { loadSnapshotRows } from '../services/load-baseline'
import type { ChapterContext } from './load-chapter-context'

type OpenChapter = Extract<ChapterContext, { _type: 'open' }>

/**
 * The run's state before chapter N: the config's starting values for chapter 1,
 * the baseline snapshot of chapter N−1 after that (§4.3).
 */
export const loadStateBefore = async (scope: RunScope, context: OpenChapter, chapter: number): Promise<RunState> =>
  context.baselineId === undefined
    ? initialStateFromRows(context.config, context.directory)
    : snapshotToState(await loadSnapshotRows(scope, context.baselineId), chapter - 1, context.directory)
