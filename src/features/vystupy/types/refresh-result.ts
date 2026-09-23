import type { DownloadReport } from '@/import'

/** What „Obnovit z Google" answers; the screen reloads its documents after `done`. */
export type RefreshResult =
  /** `archived` is false when nothing passed — the templates in use stay as they were. */
  | { _type: 'done'; report: DownloadReport; archived: boolean }
  | { _type: 'no_config' }
  | { _type: 'config_unusable'; filename: string }
  /** The archived `.xlsx` has no `Templates` sheet. */
  | { _type: 'no_sheet' }
  /** No row of the sheet names this chapter (and owner). */
  | { _type: 'no_url' }
  | { _type: 'author_required' }
  | { _type: 'failed'; message: string }
