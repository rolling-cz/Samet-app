'use client'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useCallback, useState, type MouseEvent } from 'react'
import type { DownloadItem } from '@/import'
import { sprava } from '@/locales/cs/sprava'
import type { GoogleTemplatesState } from '../../../../hooks/useGoogleTemplates'
import type { GoogleDownloadResult } from '../../../../types/google-download'
import styles from './GoogleTemplates.module.css'

interface GoogleTemplatesProps {
  state: GoogleTemplatesState
  onFetch: (event: MouseEvent<HTMLButtonElement>) => void
  onDiscard: () => void
}

const TIME_FORMAT = new Intl.DateTimeFormat('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const ItemRow = ({ item }: { item: DownloadItem }) => (
  <li className={styles.item} data-status={item.status} data-testid={`google-templates--${item.fileName}`}>
    <span className={styles.owner}>{sprava.google.owner(item.ownerLabel, item.chapter)}</span>
    {item.title && <span className={styles.docTitle}>{sprava.google.docTitle(item.title)}</span>}
    <span className={styles.status}>
      {sprava.google.statuses[item.status]}
      {item.detail && item.status !== 'ok' ? ` (${item.detail})` : ''}
    </span>
    <a href={item.editUrl} target="_blank" rel="noreferrer" className={styles.open}>
      {sprava.google.open}
    </a>
  </li>
)

const notReady = (result: Exclude<GoogleDownloadResult, { _type: 'ready' }>): string => {
  switch (result._type) {
    case 'no_config_file':
      return sprava.google.noConfigFile
    case 'no_sheet':
      return sprava.google.noSheet
    case 'no_rows':
      return sprava.google.noRows(result.skippedRows)
    case 'unreadable':
      return sprava.google.unreadable(result.message)
  }
}

/**
 * A shortcut, not a mode (§10.2): the file inputs below stay exactly as they
 * were, and what fails to download is listed by owner with a link to the tab —
 * the org has to see what did not arrive and why.
 */
export const GoogleTemplates = ({ state, onFetch, onDiscard }: GoogleTemplatesProps) => {
  const [showDownloaded, setShowDownloaded] = useState(false)
  const handleToggle = useCallback(() => setShowDownloaded((current) => !current), [])

  const result = state._type === 'done' ? state.result : undefined
  const report = result?._type === 'ready' ? result.report : undefined
  const failed = report?.items.filter((item) => item.status !== 'ok') ?? []
  const downloaded = report?.items.filter((item) => item.status === 'ok') ?? []

  return (
    <section className={styles.section} data-testid="google-templates">
      <Typography variant="subtitle2" component="h3">
        {sprava.google.title}
      </Typography>
      <Typography variant="caption" component="p" className={styles.hint}>
        {sprava.google.hint}
      </Typography>

      <div className={styles.actions}>
        <Button
          type="button"
          variant="outlined"
          onClick={onFetch}
          disabled={state._type === 'pending'}
          data-testid="google-templates--fetch"
        >
          {state._type === 'pending' ? sprava.google.fetching : sprava.google.fetch}
        </Button>
        {state._type === 'done' && (
          <Button type="button" onClick={onDiscard} data-testid="google-templates--discard">
            {sprava.google.discard}
          </Button>
        )}
      </div>

      {state._type === 'error' && <Alert severity="error">{state.message}</Alert>}
      {result && result._type !== 'ready' && <Alert severity="warning">{notReady(result)}</Alert>}

      {report && (
        <>
          <Alert
            severity={report.failedCount === 0 ? 'success' : 'warning'}
            data-testid="google-templates--summary"
          >
            {sprava.google.ready(report.okCount, report.items.length, TIME_FORMAT.format(new Date(report.fetchedAt)))}
            {report.skippedRows > 0 && ` ${sprava.google.skippedRows(report.skippedRows)}`}
          </Alert>
          {failed.length > 0 && (
            <ul className={styles.list} data-testid="google-templates--failed">
              {failed.map((item) => (
                <ItemRow key={item.fileName} item={item} />
              ))}
            </ul>
          )}
          {downloaded.length > 0 && (
            <Button type="button" onClick={handleToggle} className={styles.toggle}>
              {showDownloaded ? sprava.google.hideDownloaded : sprava.google.showDownloaded(downloaded.length)}
            </Button>
          )}
          {showDownloaded && (
            <ul className={styles.list} data-testid="google-templates--downloaded">
              {downloaded.map((item) => (
                <ItemRow key={item.fileName} item={item} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
