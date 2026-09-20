import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import styles from './PageNote.module.css'

interface PageNoteProps {
  title: string
  body: string
  testId: string
  /** Where to go from here, e.g. a link to what is missing. */
  action?: ReactNode
}

/** A screen that has only something to say: a section still to come, a chapter that cannot open yet. */
export const PageNote = ({ title, body, testId, action }: PageNoteProps) => (
  <section className={styles.section} data-testid={testId}>
    <Typography variant="h5" component="h1">
      {title}
    </Typography>
    <Typography variant="body2" className={styles.body}>
      {body}
    </Typography>
    {action && <div className={styles.action}>{action}</div>}
  </section>
)
