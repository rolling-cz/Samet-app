'use client'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useCallback } from 'react'
import { prepocet } from '@/locales/cs/prepocet'
import { useRecompute } from '../../hooks/useRecompute'
import { describeConfirmation } from '../../utils/describe-confirmation'
import { describeReport } from '../../utils/describe-report'
import styles from './RecomputePanel.module.css'

interface RecomputePanelProps {
  runId: string
  chapter: number
}

/** Compute, confirm, and one line of result each; the computation screen proper comes with trace and conflicts. */
export const RecomputePanel = ({ runId, chapter }: RecomputePanelProps) => {
  const { report, confirmation, pending, handleRun, handleConfirm } = useRecompute(runId, chapter)

  const line = report === undefined ? undefined : describeReport(report)
  const confirmationLine = confirmation === undefined ? undefined : describeConfirmation(confirmation)
  const confirmable = report?._type === 'computed' && report.conflictCount === 0 ? report : undefined

  // The dialog names the run: two runs are open side by side (§3.3).
  const handleConfirmClick = useCallback(() => {
    if (confirmable && window.confirm(prepocet.confirmQuestion(chapter, confirmable.version, runId))) handleConfirm()
  }, [confirmable, chapter, runId, handleConfirm])

  return (
    <section className={styles.panel} data-testid="recompute-panel">
      <Typography variant="h5" component="h1">
        {prepocet.title(chapter)}
      </Typography>
      <Typography variant="body2" className={styles.intro}>
        {prepocet.intro}
      </Typography>
      <Button variant="contained" onClick={handleRun} disabled={pending} data-testid="recompute-panel--run">
        {pending ? prepocet.running : prepocet.run}
      </Button>
      {line && (
        <Alert severity={line.severity} className={styles.report} data-testid="recompute-panel--report">
          {line.text}
        </Alert>
      )}
      {confirmable && confirmation?._type !== 'confirmed' && (
        <Button variant="outlined" onClick={handleConfirmClick} disabled={pending} data-testid="recompute-panel--confirm">
          {prepocet.confirm(confirmable.version)}
        </Button>
      )}
      {confirmationLine && (
        <Alert severity={confirmationLine.severity} className={styles.report} data-testid="recompute-panel--confirmation">
          {confirmationLine.text}
        </Alert>
      )}
    </section>
  )
}
