import type { DownloadItem } from '@/import'
import { vystupy } from '@/locales/cs/vystupy'
import type { RefreshResult } from '../types/refresh-result'

export interface RefreshLine {
  severity: 'success' | 'warning' | 'error'
  text: string
  /** Tabs that did not replace their template, each with its reason. */
  failures: DownloadItem[]
}

export const describeRefresh = (result: RefreshResult): RefreshLine => {
  switch (result._type) {
    case 'done': {
      const failures = result.report.items.filter((item) => item.status !== 'ok')
      const total = result.report.items.length

      return {
        severity: failures.length === 0 ? 'success' : result.archived ? 'warning' : 'error',
        text: result.archived ? vystupy.refreshDone(result.report.okCount, total) : vystupy.refreshNothing(total),
        failures,
      }
    }
    case 'no_config':
      return { severity: 'error', text: vystupy.refreshNoConfig, failures: [] }
    case 'config_unusable':
      return { severity: 'error', text: vystupy.refreshConfigUnusable(result.filename), failures: [] }
    case 'no_sheet':
      return { severity: 'warning', text: vystupy.refreshNoSheet, failures: [] }
    case 'no_url':
      return { severity: 'warning', text: vystupy.refreshNoUrl, failures: [] }
    case 'author_required':
      return { severity: 'error', text: vystupy.refreshAuthorRequired, failures: [] }
    case 'failed':
      return { severity: 'error', text: vystupy.refreshFailed(result.message), failures: [] }
  }
}
