'use client'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { prepocet } from '@/locales/cs/prepocet'
import { useRecompute } from '../../hooks/useRecompute'
import { describeReport } from '../../utils/describe-report'
import styles from './RecomputePanel.module.css'

interface RecomputePanelProps {
  runId: string
  chapter: number
}

/** One button and one line of result; the computation screen proper comes with trace and conflicts. */
export const RecomputePanel = ({ runId, chapter }: RecomputePanelProps) => {
  const { report, pending, handleRun } = useRecompute(runId, chapter)

  const line = report === undefined ? undefined : describeReport(report)

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
    </section>
  )
}
