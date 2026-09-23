import Alert from '@mui/material/Alert'
import { sprava } from '@/locales/cs/sprava'
import type { RefreshResult } from '../../types/refresh-result'
import { describeRefresh } from '../../utils/describe-refresh'
import styles from './RefreshNotice.module.css'

interface RefreshNoticeProps {
  result: RefreshResult
}

/** What the last refresh did — and, for every tab that did not make it, why and where to fix it. */
export const RefreshNotice = ({ result }: RefreshNoticeProps) => {
  const line = describeRefresh(result)

  return (
    <Alert severity={line.severity} data-testid="outputs--refresh-result">
      {line.text}
      {line.failures.length > 0 && (
        <ul className={styles.list}>
          {line.failures.map((item) => (
            <li key={item.fileName} data-testid={`outputs--refresh-failed-${item.ownerId}`}>
              <strong>{item.ownerLabel}</strong>: {sprava.google.statuses[item.status]}
              {item.detail ? ` — ${item.detail}` : ''}{' '}
              <a href={item.editUrl} target="_blank" rel="noreferrer">
                {sprava.google.open}
              </a>
            </li>
          ))}
        </ul>
      )}
    </Alert>
  )
}
