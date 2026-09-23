import { downloadGoogleTemplates } from '@/core/services/download-google-templates'
import { buildDownloadZip, downloadReport, downloadZipName, importXlsx, planDownloads } from '@/import'
import { errorMessage } from '@/utils/error-message'
import { readFormFiles } from '@/utils/read-form-field'
import { UPLOAD_FIELDS } from '../constants/upload-fields'
import type { GoogleDownloadResult } from '../types/google-download'

/**
 * Downloads every tab the workbook's `Templates` sheet names and packs them as
 * the upload expects. Writes nothing: the zip goes back to the form, and the
 * import path stays exactly as it is (`readTemplateFiles` → `inspectUpload` →
 * `persistConfig`) — pressing the button three times leaves no trace.
 */
export const fetchGoogleTemplates = async (formData: FormData): Promise<GoogleDownloadResult> => {
  const [xlsx] = readFormFiles(formData, UPLOAD_FIELDS.config)
  if (!xlsx) return { _type: 'no_config_file' }

  let config
  try {
    config = importXlsx(await xlsx.arrayBuffer()).config
  } catch (cause) {
    return { _type: 'unreadable', message: errorMessage(cause) }
  }
  if (config.templateSources === undefined) return { _type: 'no_sheet' }

  const { jobs, skippedRows } = planDownloads(config)
  if (jobs.length === 0) return { _type: 'no_rows', skippedRows }

  const startedAt = new Date()
  const files = await downloadGoogleTemplates(jobs, startedAt)
  const report = downloadReport(files, skippedRows, startedAt)
  const zip = await buildDownloadZip(files, report)

  return { _type: 'ready', report, zipName: downloadZipName(startedAt), zipBase64: Buffer.from(zip).toString('base64') }
}
