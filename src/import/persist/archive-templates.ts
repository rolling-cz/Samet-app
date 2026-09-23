import type { RunScope } from '@/db'
import { auditLog, uploadedFiles } from '@/db/schema'
import { errors } from '@/locales/cs/errors'
import type { UploadedFile } from '../types/uploaded-file'

export interface TemplateArchiveInput {
  file: UploadedFile
  author: string
  /** One line for the audit, in the org's words. */
  summary: string
  note?: string
}

/**
 * Archives templates that arrived without a config upload — „Obnovit z Google"
 * in Výstupy (§10.2). Same archive as every upload, exactly as it came (§6.5),
 * with an audit row. Templates feed only the documents, never the computation,
 * so nothing computed is marked as touched.
 */
export const archiveTemplateFile = async (scope: RunScope, input: TemplateArchiveInput): Promise<string> => {
  const [row] = await scope
    .insert(uploadedFiles, {
      kind: 'template',
      filename: input.file.filename,
      content: input.file.content,
      note: input.note ?? null,
      // The app's clock, like the templates of `archiveUpload`: the newest per owner × chapter is picked by it.
      createdAt: new Date(),
      createdBy: input.author,
    })
    .returning({ id: uploadedFiles.id })
  if (!row) throw new Error(errors.archiveFailed)

  await scope.insert(auditLog, {
    action: 'templates.refresh_google',
    entityKind: 'uploaded_files',
    entityId: row.id,
    summary: input.summary,
    author: input.author,
  })

  return row.id
}
