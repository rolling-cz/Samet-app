import { prepocet } from '@/locales/cs/prepocet'
import type { RecomputeReport } from '../types/recompute-report'

export interface ReportLine {
  severity: 'success' | 'warning' | 'error'
  text: string
}

const LIST_SEPARATOR = ', '

export const describeReport = (report: RecomputeReport): ReportLine => {
  switch (report._type) {
    case 'computed':
      return {
        severity: report.conflictCount > 0 ? 'warning' : 'success',
        text: prepocet.computed(report.version, report.conflictCount, report.newRolls.length),
      }
    case 'missing_answers':
      return {
        severity: 'warning',
        text: prepocet.missingAnswers(
          report.missingAnswers.length,
          report.missingAnswers.map((missing) => missing.questionId).join(LIST_SEPARATOR),
        ),
      }
    case 'rejected':
      return {
        severity: 'error',
        text: prepocet.rejected(report.problems.map((problem) => `${problem.code} ${problem.subject}`).join(LIST_SEPARATOR)),
      }
    case 'no_config':
      return { severity: 'warning', text: prepocet.noConfig }
    case 'config_unusable':
      return { severity: 'error', text: prepocet.configUnusable(report.filename, report.errors.length) }
    case 'no_baseline':
      return { severity: 'warning', text: prepocet.noBaseline(report.missingChapter) }
    case 'unknown_chapter':
      return { severity: 'error', text: prepocet.unknownChapter(report.chapter) }
    case 'failed':
      return { severity: 'error', text: report.message }
  }
}
