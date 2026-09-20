import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import { common } from '@/locales/cs/common'
import { importReport } from '@/locales/cs/import_report'
import { CHAPTER_LIST_SEPARATOR } from '../../../../constants/report-format'
import type { UploadReport } from '../../../../types/upload-report'
import { useIssueFilter } from '../../../../hooks/useIssueFilter'
import { buildRepairNotes } from '../../../../utils/build-repair-notes'
import { splitIssuesBySeverity } from '../../../../utils/split-issues'
import { Coverage } from './components/Coverage/Coverage'
import { IssueFilter } from './components/IssueFilter/IssueFilter'
import { IssueList } from './components/IssueList/IssueList'
import { Repairs } from './components/Repairs/Repairs'
import { Stat } from './components/Stat/Stat'
import styles from './UploadReportView.module.css'

export const UploadReportView = ({ report }: { report: UploadReport }) => {
  const { values, facets, filtered, handleQuery, handleSheet, handleCode } = useIssueFilter(report.issues)

  const { errors, warnings } = splitIssuesBySeverity(filtered)
  const repairNotes = report.repairs ? buildRepairNotes(report.repairs, report.ignoredSheets ?? []) : []

  return (
    <div className={styles.report} data-testid="upload-report">
      {report.failure && (
        <Alert severity="error" data-testid="upload-report--failure">
          {report.failure}
        </Alert>
      )}

      {report.filename !== '' && (
        <Typography variant="body2" data-testid="upload-report--verdict">
          <strong>{report.filename}</strong>{' '}
          <span className={styles.verdict} data-usable={report.ok}>
            {report.ok ? importReport.usable : importReport.unusable}
          </span>
        </Typography>
      )}

      {report.saved && (
        <Alert severity="success" data-testid="upload-report--saved">
          {importReport.saved}
          {report.removedCount ? (
            <Typography variant="body2" component="p">
              {importReport.removed(report.removedCount)}
            </Typography>
          ) : null}
        </Alert>
      )}

      {report.touchedChapters && report.touchedChapters.length > 0 && (
        <Alert severity="warning" data-testid="upload-report--touched">
          {importReport.touchedChapters(report.touchedChapters)}
        </Alert>
      )}

      {report.counts && (
        <dl className={styles.counts} data-testid="upload-report--counts">
          <Stat label={importReport.chapters} value={report.chapters?.join(CHAPTER_LIST_SEPARATOR) || common.emptyValue} />
          <Stat label={importReport.characters} value={report.counts.characters} />
          <Stat label={importReport.questions} value={report.counts.questions} />
          <Stat label={importReport.answers} value={report.counts.answers} />
          <Stat label={importReport.blocks} value={report.counts.blocks} />
          <Stat label={importReport.variations} value={report.counts.variations} />
        </dl>
      )}

      {repairNotes.length > 0 && <Repairs notes={repairNotes} />}

      {report.issues.length > 0 && (
        <IssueFilter
          values={values}
          sheets={facets.sheets}
          codes={facets.codes}
          shown={filtered.length}
          total={report.issues.length}
          onQuery={handleQuery}
          onSheet={handleSheet}
          onCode={handleCode}
        />
      )}

      {errors.length > 0 && (
        <IssueList
          title={importReport.errorsTitle(report.errorCount)}
          note={importReport.errorsNote}
          issues={errors}
          severity="error"
        />
      )}
      {warnings.length > 0 && (
        <IssueList
          title={importReport.warningsTitle(report.warningCount)}
          note={importReport.warningsNote}
          issues={warnings}
          severity="warning"
        />
      )}

      {report.coverage && <Coverage coverage={report.coverage} />}
    </div>
  )
}
