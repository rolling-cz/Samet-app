import { cache } from 'react'
import { findRun, forRun, listRuns, type RunSummary } from '@/db'
import { chapters } from '@/db/schema'
import type { ChapterSummary } from '../types/chapter-summary'

export interface RunShell {
  run: RunSummary
  runs: RunSummary[]
  chapters: ChapterSummary[]
}

/**
 * Data of the top bar present on every run screen; `undefined` for an unknown
 * run. Cached per request: the layout and the page under it both ask.
 */
export const loadRunShell = cache(async (runId: string): Promise<RunShell | undefined> => {
  const run = await findRun(runId)
  if (!run) return undefined

  const [runs, chapterRows] = await Promise.all([
    listRuns(),
    forRun(run.id).selectColumns(chapters, {
      number: chapters.number,
      status: chapters.status,
      isTouched: chapters.isTouched,
    }),
  ])

  return { run, runs, chapters: chapterRows.sort((a, b) => a.number - b.number) }
})
