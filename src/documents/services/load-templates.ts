/**
 * The run's document templates, read from the archive of uploaded files.
 *
 * Same rule as the config (§6.5): the computation reads the archived `.xlsx`,
 * not the tables, so after the game it is clear exactly what was printed from.
 * Templates follow it — there is no `templates` table to keep in step.
 *
 * One archived row may be a single `.md` **or a whole zip** of them, because
 * files are kept exactly as they arrived (rule 3), so everything is unpacked
 * before the newest of each is picked.
 */
import { eq } from 'drizzle-orm'
import type { RunScope } from '@/db'
import { uploadedFiles } from '@/db/schema'
import { readTemplateFiles } from '@/import/template-upload'
import { pickNewestTemplates, type ArchivedTemplate, type PickedTemplates } from '../convert/pick-newest-templates'

export const loadTemplates = async (scope: RunScope): Promise<PickedTemplates> => {
  // No `order by`: `pickNewestTemplates` orders by upload time itself.
  const rows = await scope.selectColumns(
    uploadedFiles,
    { filename: uploadedFiles.filename, content: uploadedFiles.content, createdAt: uploadedFiles.createdAt },
    eq(uploadedFiles.kind, 'template'),
  )

  const archived = await Promise.all(
    rows.map(async (row): Promise<ArchivedTemplate[]> =>
      (await readTemplateFiles([{ filename: row.filename, data: row.content }])).map((template) => ({
        template,
        uploadFilename: row.filename,
        uploadedAt: row.createdAt,
      })),
    ),
  )

  return pickNewestTemplates(archived.flat())
}
