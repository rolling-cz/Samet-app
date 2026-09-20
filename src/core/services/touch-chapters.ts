import type { SQL } from 'drizzle-orm'
import type { RunScope } from '@/db'
import { chapters } from '@/db/schema'

/**
 * The cascade (§3.2): marks the chapters matching `which` as touched and
 * returns their numbers. Nothing is recomputed — the org decides, and a new
 * touch asks for a new decision.
 */
export const touchChapters = async (scope: RunScope, which: SQL, reason: string): Promise<number[]> => {
  const touched = await scope
    .update(chapters, which)
    .set({
      isTouched: true,
      touchedAt: new Date(),
      touchedReason: reason,
      cascadeDecision: null,
      cascadeDecidedAt: null,
      cascadeDecidedBy: null,
    })
    .returning({ number: chapters.number })

  return touched.map((chapter) => chapter.number).sort((a, b) => a - b)
}
