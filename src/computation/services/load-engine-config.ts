import { eq } from 'drizzle-orm'
import type { RunScope } from '@/db'
import { uploadedFiles } from '@/db/schema'
import type { EngineConfig } from '@/engine'
import { importXlsx } from '@/import/import-config'
import { toEngineConfig } from '@/import/to-engine-config'

export type LoadedEngineConfig =
  | { _type: 'loaded'; config: EngineConfig; configUploadId: string }
  | { _type: 'no_config' }
  /** The archived file no longer imports cleanly — the import code changed under it. */
  | { _type: 'unusable'; configUploadId: string; filename: string; errors: string[] }

/**
 * The engine's config comes from the archived `.xlsx`, not from the tables:
 * the computation then points at exactly the file it was computed from, and
 * there is no second "tables → `EngineConfig`" converter to keep in step.
 *
 * Every archived config passed the import — `persistConfig` archives inside the
 * transaction that writes it — so the newest one is the run's valid config. It
 * is parsed again all the same, and one with errors is never used.
 */
export const loadEngineConfig = async (scope: RunScope): Promise<LoadedEngineConfig> => {
  const uploads = await scope.selectColumns(
    uploadedFiles,
    { id: uploadedFiles.id, createdAt: uploadedFiles.createdAt },
    eq(uploadedFiles.kind, 'config'),
  )
  const [latest] = [...uploads].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  if (!latest) return { _type: 'no_config' }

  const [file] = await scope.selectColumns(
    uploadedFiles,
    { filename: uploadedFiles.filename, content: uploadedFiles.content },
    eq(uploadedFiles.id, latest.id),
  )
  if (!file) return { _type: 'no_config' }

  const imported = importXlsx(file.content)
  if (!imported.usable) {
    return {
      _type: 'unusable',
      configUploadId: latest.id,
      filename: file.filename,
      errors: imported.errors.map((issue) => issue.message),
    }
  }

  return { _type: 'loaded', config: toEngineConfig(imported.config), configUploadId: latest.id }
}
