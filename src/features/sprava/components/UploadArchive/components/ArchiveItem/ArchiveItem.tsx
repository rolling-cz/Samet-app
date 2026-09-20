import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import { useCallback } from 'react'
import { runPath } from '@/core'
import { APP_LOCALE } from '@/locales/app-locale'
import { sprava } from '@/locales/cs/sprava'
import { archiveFilePath } from '../../../../constants/archive-download'
import { INLINE_SEPARATOR } from '../../../../constants/report-format'
import type { ArchiveRow } from '../../../../types/archive-row'
import { extractIssues } from '../../../../utils/extract-issues'
import { formatIssueLocation } from '../../../../utils/format-issue-location'
import { splitIssuesBySeverity } from '../../../../utils/split-issues'
import styles from './ArchiveItem.module.css'

interface ArchiveItemProps {
  runId: string
  upload: ArchiveRow
  isExpanded: boolean
  onToggle: (uploadId: string) => void
}

export const ArchiveItem = ({ runId, upload, isExpanded, onToggle }: ArchiveItemProps) => {
  const handleToggle = useCallback(() => onToggle(upload.id), [onToggle, upload.id])

  const isConfig = upload.kind === 'config'
  const issues = extractIssues(upload.importReport)
  const { errors, warnings } = splitIssuesBySeverity(issues)

  const meta = [new Date(upload.createdAt).toLocaleString(APP_LOCALE), upload.createdBy]
  if (upload.note) meta.push(upload.note)

  return (
    <li
      className={styles.item}
      data-testid={`archive-item--${upload.id}`}
      data-kind={upload.kind}
      data-emergency={upload.reason !== null}
    >
      <div className={styles.row}>
        <div>
          <Typography variant="subtitle2" component="div">
            {upload.filename}
            <Chip size="small" label={sprava.kindLabels[upload.kind]} className={styles.chip} />
          </Typography>
          <Typography variant="caption" component="p" className={styles.muted}>
            {meta.join(INLINE_SEPARATOR)}
          </Typography>
          {isConfig && upload.reason && (
            <Typography variant="caption" component="p" className={styles.reason}>
              {sprava.emergencyReason(upload.reason)}
            </Typography>
          )}
          {isConfig && (
            <Typography variant="caption" component="p" className={styles.muted}>
              {sprava.issueSummary(warnings.length, errors.length)}
            </Typography>
          )}
        </div>

        <div className={styles.actions}>
          {isConfig && (
            <Button variant="outlined" onClick={handleToggle} data-testid={`archive-item--toggle--${upload.id}`}>
              {isExpanded ? sprava.hideChecks : sprava.showChecks}
            </Button>
          )}
          <Button
            component="a"
            href={archiveFilePath(runPath(runId), upload.id)}
            color="inherit"
            data-testid={`archive-item--download--${upload.id}`}
          >
            {sprava.download}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <ul className={styles.findings}>
          {issues.length === 0 && (
            <li>
              <Typography variant="caption" className={styles.muted}>
                {sprava.noFindings}
              </Typography>
            </li>
          )}
          {issues.map((issue, index) => (
            <li key={`${issue.code}-${index}`}>
              <Typography variant="caption">
                <code className={styles.muted}>{formatIssueLocation(issue.location)}</code> {issue.message}
              </Typography>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
