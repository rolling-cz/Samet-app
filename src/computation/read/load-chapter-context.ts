import { cache } from 'react'
import { forRun, type RunScope } from '@/db'
import { FIRST_CHAPTER } from '@/db/constants/chapters'
import { buildIdDirectory } from '../convert/build-id-directory'
import { loadBaseline } from '../services/load-baseline'
import { loadConfigRows } from '../services/load-config-rows'
import type { ConfigRows } from '../types/config-rows'
import type { IdDirectory } from '../types/id-directory'

export type ChapterContext =
  | {
      _type: 'open'
      config: ConfigRows
      directory: IdDirectory
      chapterId: string
      /** Baseline computation of the chapter before; absent for chapter 1, which starts from the config. */
      baselineId?: string
    }
  | { _type: 'blocked'; missingChapter: number }

const buildChapterContext = async (scope: RunScope, chapter: number): Promise<ChapterContext> => {
  const config = await loadConfigRows(scope)
  const directory = buildIdDirectory(config)
  const chapterId = directory.chapters.toDb(chapter)
  if (chapter === FIRST_CHAPTER) return { _type: 'open', config, directory, chapterId }

  const previousChapter = chapter - 1
  const baseline = await loadBaseline(scope, directory.chapters.toDb(previousChapter))
  if (!baseline) return { _type: 'blocked', missingChapter: previousChapter }

  return { _type: 'open', config, directory, chapterId, baselineId: baseline.id }
}

/**
 * One screen asks several reads about the same chapter; within a request they
 * share this. Config and baseline are all it holds, and no answer write changes either.
 */
const chapterContextOf = cache((runId: string, chapter: number) => buildChapterContext(forRun(runId), chapter))

/** What every read of a chapter starts from. A chapter the run does not have is an `UnknownIdError`. */
export const loadChapterContext = (scope: RunScope, chapter: number): Promise<ChapterContext> =>
  chapterContextOf(scope.runId, chapter)
