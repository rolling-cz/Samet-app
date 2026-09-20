import { inArray } from 'drizzle-orm'
import { touchChapters } from '@/core/services/touch-chapters'
import type { RunScope } from '@/db'
import { chapters, computations } from '@/db/schema'

/**
 * An emergency config fix marks every computed chapter as touched — the same
 * cascade as fixing an answer (§3.2, §6.5). Nothing is recomputed; the org decides.
 */
export const touchComputedChapters = async (scope: RunScope, reason: string): Promise<number[]> => {
  const chapterIds = new Set<string>()
  for (const row of await scope.selectColumns(computations, { chapterId: computations.chapterId })) {
    chapterIds.add(row.chapterId)
  }
  if (chapterIds.size === 0) return []

  return touchChapters(scope, inArray(chapters.id, [...chapterIds]), reason)
}
