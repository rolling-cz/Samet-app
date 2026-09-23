import type { DownloadReport } from '@/import'

/**
 * What „Načíst z Google" answers. The zip comes back to the browser rather than
 * into the database: it joins the form like a hand-picked file, and only the
 * ordinary save archives it (§6.5).
 */
export type GoogleDownloadResult =
  | { _type: 'ready'; report: DownloadReport; zipName: string; zipBase64: string }
  | { _type: 'no_config_file' }
  | { _type: 'unreadable'; message: string }
  /** The workbook has no `Templates` sheet. */
  | { _type: 'no_sheet' }
  /** The sheet is there, but not one row could be downloaded. */
  | { _type: 'no_rows'; skippedRows: number }
