import Typography from '@mui/material/Typography'
import { TitledPanel, type PanelTone } from '@/components'
import type { Issue, IssueSeverity } from '@/import'
import { importReport } from '@/locales/cs/import_report'
import { formatIssueLocation } from '../../../../../../utils/format-issue-location'
import styles from './IssueList.module.css'

const SEVERITY_TONES: Readonly<Record<IssueSeverity, PanelTone>> = Object.freeze({
  error: 'error',
  warning: 'warning',
})

interface IssueListProps {
  title: string
  note: string
  issues: Issue[]
  severity: IssueSeverity
}

export const IssueList = ({ title, note, issues, severity }: IssueListProps) => (
  <TitledPanel title={title} note={note} tone={SEVERITY_TONES[severity]} testId={`issue-list--${severity}`}>
    <ul className={styles.items}>
      {issues.map((issue, index) => (
        <li key={`${issue.code}-${index}`} className={styles.item}>
          <code className={styles.location}>{formatIssueLocation(issue.location)}</code>
          <Typography variant="body2">{issue.message}</Typography>
          {issue.suggestion && (
            <Typography variant="caption" component="p" className={styles.suggestion}>
              {importReport.didYouMeanBefore}
              <code className={styles.suggestedValue}>{issue.suggestion}</code>
              {importReport.didYouMeanAfter}
            </Typography>
          )}
        </li>
      ))}
    </ul>
  </TitledPanel>
)
