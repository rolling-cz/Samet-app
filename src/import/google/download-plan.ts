/**
 * From the `Templates` sheet to the files the upload expects (§10.2).
 *
 * The file name is composed from the mapping — `<ID>_<kapitola>.md`, the very
 * convention `parseTemplateFilename` reads — never from Google's
 * `Content-Disposition`, which carries the document's title and would parse to
 * nobody. The title still goes into the report: `Marie, kapitola 2 ← „Mirek
 * Pokorný – kap. 2"` shows a swapped row at a glance.
 */
import JSZip from 'jszip'
import { personLabel } from '@/utils/person-label'
import { DOWNLOAD_REPORT_FILE } from '../constants/google-templates'
import { printedChapters } from '../template-upload'
import type { ParsedConfig } from '../types/parsed-config'
import type { DownloadOutcome } from './classify-download'
import { googleDocEditUrl, googleDocExportUrl } from './google-doc-url'

export interface DownloadJob {
  ownerKind: 'character' | 'group'
  ownerId: string
  ownerLabel: string
  chapter: number
  /** `Marie_2.md` — what the upload's file-name rule reads. */
  fileName: string
  exportUrl: string
  /** Where the org opens the tab to fix it. */
  editUrl: string
}

export type DownloadStatus =
  | Exclude<DownloadOutcome['_type'], 'ok'>
  | 'ok'
  | 'timed_out'
  | 'network_error'
  /** Not attempted: the batch ran out of time first. */
  | 'skipped_deadline'
  /** Downloaded, but it would add an import error; the template in use stays. */
  | 'rejected'

export interface DownloadItem extends Omit<DownloadJob, 'exportUrl'> {
  status: DownloadStatus
  /** Google's document title, when it sent one. */
  title?: string
  /** HTTP status or content type behind a `failed` / `not_markdown`. */
  detail?: string
}

export interface DownloadReport {
  fetchedAt: string
  items: DownloadItem[]
  okCount: number
  failedCount: number
  /** Rows of the sheet that could not become a job — the config check says why. */
  skippedRows: number
}

export const planDownloads = (config: ParsedConfig): { jobs: DownloadJob[]; skippedRows: number } => {
  const labels = new Map<string, string>([
    ...config.characters.map(
      (character) => [character.externalId, personLabel(character.firstName, character.lastName, character.externalId)] as const,
    ),
    ...config.groups.map((group) => [group.externalId, group.name] as const),
  ])

  const printed = printedChapters(config)
  const jobs: DownloadJob[] = []
  const seen = new Set<string>()
  let skippedRows = 0

  for (const source of config.templateSources ?? []) {
    const fileName = source.owner && `${source.owner.id}_${source.chapter}.md`
    // Invalid rows are errors of the config check already; a duplicate pair keeps its first row.
    if (!source.owner || !source.ref || !fileName || !printed.includes(source.chapter) || seen.has(fileName)) {
      skippedRows++
      continue
    }
    seen.add(fileName)

    jobs.push({
      ownerKind: source.owner.kind,
      ownerId: source.owner.id,
      ownerLabel: labels.get(source.owner.id) ?? source.owner.id,
      chapter: source.chapter,
      fileName,
      exportUrl: googleDocExportUrl(source.ref),
      editUrl: googleDocEditUrl(source.ref),
    })
  }

  return { jobs, skippedRows }
}

export interface DownloadedFile {
  item: DownloadItem
  markdown?: string
}

export const downloadReport = (files: readonly DownloadedFile[], skippedRows: number, fetchedAt: Date): DownloadReport => {
  const items = files.map(({ item }) => item)
  const okCount = items.filter((item) => item.status === 'ok').length

  return { fetchedAt: fetchedAt.toISOString(), items, okCount, failedCount: items.length - okCount, skippedRows }
}

/** `sablony-google_2026-09-23_10-15-02.zip` — the archive lists it under this name. */
export const downloadZipName = (fetchedAt: Date): string =>
  `sablony-google_${fetchedAt.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-')}.zip`

/** Only what downloaded cleanly goes in; a failure is in the report, never an empty template. */
export const buildDownloadZip = async (files: readonly DownloadedFile[], report: DownloadReport): Promise<Uint8Array> => {
  const zip = new JSZip()
  for (const { item, markdown } of files) {
    if (item.status === 'ok' && markdown !== undefined) zip.file(item.fileName, markdown)
  }
  zip.file(DOWNLOAD_REPORT_FILE, JSON.stringify(report, null, 2))

  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}
