/**
 * Writing a checked config into the database (§6.5, §10.2).
 *
 *  - **One valid config per run.** Entities are upserted by source ID and rows
 *    the sheet no longer carries are removed, so a re-upload never duplicates
 *    anything nor leaves stale entities for the engine.
 *  - **Before the first computation** uploading is free: nothing derived from
 *    the config exists yet.
 *  - **After it** the config is frozen. An upload is an emergency fix: it needs
 *    a reason, may not remove an authored entity (derived answer effects may
 *    go), and marks computed chapters as touched.
 *  - **Every uploaded file is archived as it arrived** — the archive, not
 *    versions, is what makes the config traceable after the game.
 *
 * All access goes through `forRun(runId)` — architecture rule 2.
 */
import { forRun, type RunScope } from '@/db'
import { auditLog } from '@/db/schema'
import { audit } from '@/locales/cs/audit'
import { errors } from '@/locales/cs/errors'
import type { Issue } from '../types/issue'
import type { ParsedConfig } from '../types/parsed-config'
import type { UploadedFile } from '../types/uploaded-file'
import { listLabels } from '../utils/list-labels'
import { archiveUpload } from './archive-upload'
import { isConfigFrozen } from './is-config-frozen'
import { parkOrdinals } from './park-ordinals'
import { findStaleRows, removeStaleRows, staleAuthoredLabels } from './remove-stale-rows'
import { touchComputedChapters } from './touch-computed-chapters'
import { writeEntities } from './write-entities'

export interface PersistInput {
  runId: string
  config: ParsedConfig
  issues: Issue[]
  /** The `.xlsx` exactly as uploaded. */
  configFile: UploadedFile
  /** Template files exactly as uploaded (`.md` or `.zip`). */
  templateFiles: UploadedFile[]
  /** Free-text name from the „Kdo jsi?" field (§3.1). */
  author: string
  note?: string
  /** Required once the run has a computation (§6.5). */
  reason?: string
}

export interface PersistResult {
  configUploadId: string
  removedCount: number
  /** Chapters an emergency fix marked as touched. */
  touchedChapters: number[]
}

/** Refuses a config with errors: a broken config must never reach the database (§10.2). */
export const persistConfig = async (input: PersistInput): Promise<PersistResult> => {
  if (input.issues.some((issue) => issue.severity === 'error')) throw new Error(errors.configHasErrors)

  const reason = input.reason?.trim() ?? ''

  return forRun(input.runId).transaction(async (scope) => {
    const frozen = await isConfigFrozen(scope)
    if (frozen && reason === '') throw new Error(errors.reasonRequiredWhenFrozen)

    const configUploadId = await archiveUpload(scope, {
      configFile: input.configFile,
      templateFiles: input.templateFiles,
      importReport: { issues: input.issues, repairs: input.config.repairs },
      author: input.author,
      note: input.note,
      reason,
    })

    await parkOrdinals(scope)
    const written = await writeEntities(scope, input.config)
    const stale = await findStaleRows(scope, written)

    const dropped = staleAuthoredLabels(stale)
    if (frozen && dropped.length > 0) throw new Error(errors.removalWhenFrozen(listLabels(dropped)))

    const removedCount = await removeStaleRows(scope, stale)
    const touchedChapters = frozen ? await touchComputedChapters(scope, reason) : []

    const result: PersistResult = { configUploadId, removedCount, touchedChapters }
    await writeImportAudit(scope, input, result, frozen ? reason : undefined)

    return result
  })
}

/** `emergencyReason` is set only for a fix to a frozen config. */
const writeImportAudit = async (
  scope: RunScope,
  input: PersistInput,
  result: PersistResult,
  emergencyReason: string | undefined,
): Promise<void> => {
  const filename = input.configFile.filename

  await scope.insert(auditLog, {
    action: emergencyReason ? 'config.emergency_fix' : 'config.import',
    entityKind: 'uploaded_files',
    entityId: result.configUploadId,
    summary: emergencyReason
      ? audit.configEmergencyFix(filename, result.touchedChapters)
      : audit.configImport(filename, result.removedCount),
    valueAfter: { removedCount: result.removedCount, touchedChapters: result.touchedChapters },
    reason: emergencyReason ?? null,
    author: input.author,
  })
}
