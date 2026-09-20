import Typography from '@mui/material/Typography'
import styles from './PageNote.module.css'

interface PageNoteProps {
  title: string
  body: string
  testId: string
}

/** A screen that has only something to say: a section still to come, a chapter that cannot open yet. */
export const PageNote = ({ title, body, testId }: PageNoteProps) => (
  <section className={styles.section} data-testid={testId}>
    <Typography variant="h5" component="h1">
      {title}
    </Typography>
    <Typography variant="body2" className={styles.body}>
      {body}
    </Typography>
  </section>
)
