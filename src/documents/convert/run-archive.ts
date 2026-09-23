/**
 * `beh.json` in the chapter zip (§10.4): the machine-readable archive of what
 * the chapter's documents were made from — the computation they were filled
 * from with its complete state, trace and conflicts, plus what came out.
 *
 * The state and trace are passed through exactly as stored: this file is the
 * record, and a record that was reshaped on the way out is no longer one.
 */
import type { OutputOverview } from '../types/overview'
import type { GeneratedDocument } from '../types/document'

/** Bump when the shape changes, so a reader after the game knows what it holds. */
const RUN_ARCHIVE_FORMAT = 1

export interface ComputationRecord {
  id: string
  version: number
  status: string
  isReleased: boolean
  configUploadId: string
  engineVersion: string
  inputHash: string
  createdAt: Date
  createdBy: string
  confirmedAt: Date | null
  confirmedBy: string | null
  result: unknown
  trace: unknown
  conflicts: unknown
}

export interface RunArchiveInput {
  runId: string
  chapter: number
  generatedAt: Date
  /** Absent for chapter 1, which is filled from the config alone. */
  computation?: ComputationRecord
  overview: OutputOverview
  documents: readonly GeneratedDocument[]
}

const runArchive = ({ runId, chapter, generatedAt, computation, overview, documents }: RunArchiveInput) => ({
  format: RUN_ARCHIVE_FORMAT,
  runId,
  chapter,
  generatedAt: generatedAt.toISOString(),
  computation: computation ?? null,
  overview,
  documents: documents.map(({ owner, fileName, markdown }) => ({ owner, fileName, markdown })),
})

export const runArchiveJson = (input: RunArchiveInput): string => JSON.stringify(runArchive(input), null, 2)
