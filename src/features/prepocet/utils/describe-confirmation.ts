import { prepocet } from '@/locales/cs/prepocet'
import type { ConfirmReport } from '../actions/confirm'
import type { ReportLine } from './describe-report'

export const describeConfirmation = (report: ConfirmReport): ReportLine => {
  switch (report._type) {
    case 'confirmed':
      return { severity: 'success', text: prepocet.confirmed(report.chapter, report.version) }
    case 'already_confirmed':
      return { severity: 'warning', text: prepocet.alreadyConfirmed }
    case 'has_conflicts':
      return { severity: 'warning', text: prepocet.confirmHasConflicts(report.conflictCount) }
    case 'not_found':
      return { severity: 'error', text: prepocet.confirmNotFound }
    case 'failed':
      return { severity: 'error', text: report.message }
  }
}
