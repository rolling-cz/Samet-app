import { eq } from 'drizzle-orm'
import type { RunScope } from '@/db'
import { computations } from '@/db/schema'
import type { ComputationRecord } from '../convert/run-archive'

/** The computation a chapter's documents were filled from, for `beh.json` (§10.4). */
export const loadComputationRecord = async (
  scope: RunScope,
  computationId: string,
): Promise<ComputationRecord | undefined> => {
  const [row] = await scope.selectColumns(
    computations,
    {
      id: computations.id,
      version: computations.version,
      status: computations.status,
      isReleased: computations.isReleased,
      configUploadId: computations.configUploadId,
      engineVersion: computations.engineVersion,
      inputHash: computations.inputHash,
      createdAt: computations.createdAt,
      createdBy: computations.createdBy,
      confirmedAt: computations.confirmedAt,
      confirmedBy: computations.confirmedBy,
      result: computations.resultJson,
      trace: computations.traceJson,
      conflicts: computations.conflictsJson,
    },
    eq(computations.id, computationId),
  )

  return row
}
