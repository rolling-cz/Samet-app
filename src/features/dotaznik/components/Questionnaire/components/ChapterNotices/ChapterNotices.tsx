import Alert from '@mui/material/Alert'
import { dotaznik } from '@/locales/cs/dotaznik'
import styles from './ChapterNotices.module.css'

interface ChapterNoticesProps {
  isReleased: boolean
  isStale: boolean
  /** Given once for this character; shown so the org knows what every change is filed under. */
  reason: string | undefined
}

/** What the chapter's state means for editing (§3.2). The app says so and recomputes nothing. */
export const ChapterNotices = ({ isReleased, isStale, reason }: ChapterNoticesProps) => (
  <div className={styles.notices}>
    {isReleased && (
      <Alert severity="warning" data-testid="questionnaire--released">
        {reason === undefined ? dotaznik.releasedNote : dotaznik.releasedReasonGiven(reason)}
      </Alert>
    )}
    {isStale && (
      <Alert severity="info" data-testid="questionnaire--stale">
        {dotaznik.staleComputation}
      </Alert>
    )}
  </div>
)
