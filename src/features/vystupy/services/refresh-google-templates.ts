import { loadEngineConfig } from '@/computation/services/load-engine-config'
import { downloadGoogleTemplates } from '@/core/services/download-google-templates'
import { forRun } from '@/db'
import { loadTemplates } from '@/documents'
import {
  archiveTemplateFile,
  buildDownloadZip,
  downloadReport,
  downloadZipName,
  planDownloads,
  refreshedTemplateErrors,
  templateErrorBaseline,
  toParsedTemplate,
  type DownloadedFile,
} from '@/import'
import { audit } from '@/locales/cs/audit'
import type { RefreshResult } from '../types/refresh-result'

export interface RefreshRequest {
  runId: string
  /** The chapter the documents are for (N+1 in the Výstupy of N). */
  chapter: number
  /** One owner's tab; absent = every tab of the chapter. */
  ownerId?: string
  author: string
}

/**
 * „Obnovit z Google" in Výstupy (§10.2): fetch the chapter's tabs again from
 * the URLs in the archived config's `Templates` sheet — no re-upload of the
 * `.xlsx` or of any template.
 *
 * Each downloaded tab passes the same import checks as an upload, against the
 * archived config and every other template in use; one that would add an error
 * is reported and not used, so a half-edited tab never replaces a good
 * template. What passes is archived exactly as downloaded, in a zip with the
 * download report, and from then on beats any uploaded file (`templateWins`).
 */
export const refreshGoogleTemplates = async ({ runId, chapter, ownerId, author }: RefreshRequest): Promise<RefreshResult> => {
  const scope = forRun(runId)
  const loaded = await loadEngineConfig(scope)
  if (loaded._type === 'no_config') return { _type: 'no_config' }
  if (loaded._type === 'unusable') return { _type: 'config_unusable', filename: loaded.filename }
  if (loaded.parsed.templateSources === undefined) return { _type: 'no_sheet' }

  const jobs = planDownloads(loaded.parsed).jobs.filter(
    (job) => job.chapter === chapter && (ownerId === undefined || job.ownerId.toLowerCase() === ownerId.toLowerCase()),
  )
  if (jobs.length === 0) return { _type: 'no_url' }

  const startedAt = new Date()
  const [downloaded, picked] = await Promise.all([downloadGoogleTemplates(jobs, startedAt), loadTemplates(scope)])
  const inUse = [...picked.byOwner.values()].map((entry) => entry.template)
  const baseline = templateErrorBaseline(loaded.parsed, inUse)

  const checked = downloaded.map((file): DownloadedFile => {
    if (file.item.status !== 'ok' || file.markdown === undefined) return file

    const candidate = toParsedTemplate({ filename: file.item.fileName, markdown: file.markdown, fromGoogle: true })
    const errors = refreshedTemplateErrors(loaded.parsed, inUse, candidate, baseline)

    return errors.length === 0 ? file : { item: { ...file.item, status: 'rejected', detail: errors.join(' · ') } }
  })

  const report = downloadReport(checked, 0, startedAt)
  if (report.okCount === 0) return { _type: 'done', report, archived: false }

  const zip = await buildDownloadZip(checked, report)
  const accepted = report.items.filter((item) => item.status === 'ok').map((item) => item.fileName)
  const rejected = report.items.filter((item) => item.status === 'rejected').length

  await scope.transaction((tx) =>
    archiveTemplateFile(tx, {
      file: { filename: downloadZipName(startedAt), content: Buffer.from(zip) },
      author,
      summary: audit.templatesRefreshed(chapter, accepted, rejected),
    }),
  )

  return { _type: 'done', report, archived: true }
}
