import type { RunScope } from '@/db'
import { uploadedFiles } from '@/db/schema'
import { errors } from '@/locales/cs/errors'
import type { UploadedFile } from '../types/uploaded-file'

export interface ArchiveInput {
  configFile: UploadedFile
  templateFiles: UploadedFile[]
  importReport: unknown
  author: string
  note?: string
  reason?: string
}

/** Keeps every file exactly as uploaded (§6.5); returns the archived config's ID. */
export const archiveUpload = async (scope: RunScope, input: ArchiveInput): Promise<string> => {
  const note = input.note || null
  const reason = input.reason || null

  const [config] = await scope
    .insert(uploadedFiles, {
      kind: 'config',
      filename: input.configFile.filename,
      content: input.configFile.content,
      importReport: input.importReport,
      note,
      reason,
      createdBy: input.author,
    })
    .returning({ id: uploadedFiles.id })
  if (!config) throw new Error(errors.archiveFailed)

  // `now()` is the transaction's start, so every file of one upload would tie
  // and the newest template per owner × chapter would be picked by chance.
  // Later in the list is newer (a Google template still beats any upload).
  let stamp = 0
  for (const file of input.templateFiles) {
    stamp = Math.max(Date.now(), stamp + 1)
    await scope.insert(uploadedFiles, {
      kind: 'template',
      filename: file.filename,
      content: file.content,
      note,
      reason,
      createdAt: new Date(stamp),
      createdBy: input.author,
    })
  }

  return config.id
}
