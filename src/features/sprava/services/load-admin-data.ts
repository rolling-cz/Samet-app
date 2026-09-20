import { forRun, type RunScope } from '@/db'
import { uploadedFiles } from '@/db/schema'
import { isConfigFrozen } from '@/import'
import type { ArchiveRow } from '../types/archive-row'

export interface AdminData {
  /** Newest first. */
  uploads: ArchiveRow[]
  /** The run has a computation, so an upload is an emergency fix (§6.5). */
  isConfigFrozen: boolean
}

/** Config first within one upload: its templates share the transaction's timestamp. */
const byNewest = (a: ArchiveRow, b: ArchiveRow): number =>
  b.createdAt.getTime() - a.createdAt.getTime() || Number(b.kind === 'config') - Number(a.kind === 'config')

const loadUploads = async (scope: RunScope): Promise<ArchiveRow[]> => {
  const rows = await scope.selectColumns(uploadedFiles, {
    id: uploadedFiles.id,
    kind: uploadedFiles.kind,
    filename: uploadedFiles.filename,
    note: uploadedFiles.note,
    reason: uploadedFiles.reason,
    createdAt: uploadedFiles.createdAt,
    createdBy: uploadedFiles.createdBy,
    importReport: uploadedFiles.importReport,
  })

  return rows.sort(byNewest)
}

/** The run layout has already checked that the run exists. */
export const loadAdminData = async (runId: string): Promise<AdminData> => {
  const scope = forRun(runId)
  const [uploads, frozen] = await Promise.all([loadUploads(scope), isConfigFrozen(scope)])

  return { uploads, isConfigFrozen: frozen }
}
