import { eq } from 'drizzle-orm'
import type { RunScope } from '@/db'
import { uploadedFiles } from '@/db/schema'
import type { EngineConfig } from '@/engine'
import { importXlsx } from '@/import/import-config'
import type { ParsedConfig } from '@/import/types/parsed-config'
import { toEngineConfig } from '@/import/to-engine-config'

export type LoadedEngineConfig =
  | {
      _type: 'loaded'
      config: EngineConfig
      /** The same file as parsed by the import — for what the engine does not read, like the `Templates` sheet. */
      parsed: ParsedConfig
      configUploadId: string
    }
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
  const [latest] = await scope.selectColumnsOrdered(
    uploadedFiles,
    { id: uploadedFiles.id, filename: uploadedFiles.filename, content: uploadedFiles.content },
    { by: uploadedFiles.createdAt, direction: 'desc', limit: 1 },
    eq(uploadedFiles.kind, 'config'),
  )
  if (!latest) return { _type: 'no_config' }

  const imported = importXlsx(latest.content)
  if (!imported.usable) {
    return {
      _type: 'unusable',
      configUploadId: latest.id,
      filename: latest.filename,
      errors: imported.errors.map((issue) => issue.message),
    }
  }

  return { _type: 'loaded', config: toEngineConfig(imported.config), parsed: imported.config, configUploadId: latest.id }
}
