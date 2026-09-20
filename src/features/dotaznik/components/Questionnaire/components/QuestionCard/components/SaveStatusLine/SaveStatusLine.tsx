import CloudDone from '@mui/icons-material/CloudDone'
import ErrorOutline from '@mui/icons-material/ErrorOutlined'
import Sync from '@mui/icons-material/Sync'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { memo } from 'react'
import type { AnswerView } from '@/computation'
import { dotaznik } from '@/locales/cs/dotaznik'
import type { SaveStatus } from '../../../../../../types/save-status'
import { formatTimestamp } from '../../../../../../utils/format-timestamp'
import styles from './SaveStatusLine.module.css'

interface SaveStatusLineProps {
  questionId: string
  status: SaveStatus
  saved: AnswerView | undefined
  failure: string | undefined
  onRetry: () => void
  onCancel: () => void
}

type Tone = 'pending' | 'saved' | 'unsaved'

const TONE_ICONS = Object.freeze({ pending: Sync, saved: CloudDone, unsaved: ErrorOutline } satisfies Record<Tone, typeof Sync>)

const toneOf = (status: SaveStatus): Tone | undefined => {
  if (status === 'failed' || status === 'invalid') return 'unsaved'
  if (status === 'saving' || status === 'dirty') return 'pending'

  return undefined
}

/**
 * saving → saved (who, when) → not saved, retry (§6.4): an icon as well as a
 * colour. „zrušit odpověď" sits here, away from the options, so it cannot be
 * taken for one of them.
 */
export const SaveStatusLine = memo(function SaveStatusLine({
  questionId,
  status,
  saved,
  failure,
  onRetry,
  onCancel,
}: SaveStatusLineProps) {
  const tone: Tone | undefined = toneOf(status) ?? (saved || status === 'saved' ? 'saved' : undefined)
  const Icon = tone === undefined ? undefined : TONE_ICONS[tone]

  return (
    <div className={styles.line} data-tone={tone} data-testid={`save-status--${questionId}`} aria-live="polite">
      {Icon && <Icon fontSize="inherit" />}
      <Typography variant="caption" component="span" className={styles.text}>
        {tone === 'pending' && dotaznik.saving}
        {tone === 'unsaved' && (status === 'invalid' ? dotaznik.invalidNotSaved : `${dotaznik.notSaved}: ${failure ?? ''}`)}
        {tone === 'saved' && saved && (
          <time dateTime={saved.answeredAt} suppressHydrationWarning>
            {dotaznik.saved(saved.answeredBy, formatTimestamp(saved.answeredAt))}
          </time>
        )}
        {tone === 'saved' && !saved && dotaznik.cancelled}
      </Typography>
      {status === 'failed' && (
        <Button color="inherit" onClick={onRetry} data-testid={`save-retry--${questionId}`}>
          {dotaznik.retry}
        </Button>
      )}
      <span className={styles.spacer} />
      {saved && (
        <Button
          color="inherit"
          className={styles.cancel}
          onClick={onCancel}
          title={dotaznik.cancelAnswerHint}
          data-testid={`cancel-answer--${questionId}`}
        >
          {dotaznik.cancelAnswer}
        </Button>
      )}
    </div>
  )
})
