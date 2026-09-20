import { and, eq } from 'drizzle-orm'
import { forRun } from '@/db'
import { auditLog, chapters, computations } from '@/db/schema'
import { ANSWER_AUDIT_ENTITY } from '../constants/audit-actions'
import { chapterStaleness } from '../convert/chapter-staleness'
import { UnknownIdError } from '../errors/unknownIdError'
import type { ChapterStaleness } from '../types/chapter-staleness'

/** Read from the audit, not from `answers`: a cancelled answer has no row left to date the change by. */
export const loadChapterStaleness = async (runId: string, chapter: number): Promise<ChapterStaleness> => {
  const scope = forRun(runId)
  const [chapterRow] = await scope.selectColumns(chapters, { id: chapters.id }, eq(chapters.number, chapter))
  if (!chapterRow) throw new UnknownIdError('chapter', chapter, 'to_database')

  const [computed, changed] = await Promise.all([
    scope.selectColumns(computations, { createdAt: computations.createdAt }, eq(computations.chapterId, chapterRow.id)),
    scope.selectColumns(
      auditLog,
      { createdAt: auditLog.createdAt },
      and(eq(auditLog.chapterId, chapterRow.id), eq(auditLog.entityKind, ANSWER_AUDIT_ENTITY)),
    ),
  ])

  return chapterStaleness(
    computed.map((row) => row.createdAt),
    changed.map((row) => row.createdAt),
  )
}
