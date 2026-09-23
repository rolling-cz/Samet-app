'use client'

import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { memo, useCallback, useState } from 'react'
import { vystupy } from '@/locales/cs/vystupy'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import type { DocumentItemView } from '../../types/outputs-view'
import styles from './DocumentItem.module.css'

interface DocumentItemProps {
  document: DocumentItemView
  markdownHref: string
  pdfHref: string
  /** This document's tab (or the whole chapter) is being fetched right now. */
  refreshing: boolean
  refreshDisabled: boolean
  onRefresh: (ownerId: string) => void
}

const COPY_LABEL = Object.freeze({ idle: vystupy.copy, copied: vystupy.copied, failed: vystupy.copyFailed })

/** One owner's document: copy, download, and the filled text to read before printing. */
export const DocumentItem = memo(function DocumentItem({
  document,
  markdownHref,
  pdfHref,
  refreshing,
  refreshDisabled,
  onRefresh,
}: DocumentItemProps) {
  const [open, setOpen] = useState(false)
  const { state: copyState, copy } = useCopyToClipboard(document.markdown)
  const hasProblems = document.problems.length > 0
  const { template } = document
  const testId = `outputs--document-${document.owner.id}`

  const handleToggle = useCallback(() => setOpen((current) => !current), [])
  const handleCopy = useCallback(() => void copy(), [copy])
  const handleRefresh = useCallback(() => onRefresh(document.owner.id), [onRefresh, document.owner.id])

  return (
    <li className={styles.item} data-problems={hasProblems} data-testid={testId}>
      <div className={styles.row}>
        <div className={styles.name}>
          <Typography variant="body2" component="span" className={styles.label}>
            {document.ownerLabel}
          </Typography>
          <Typography variant="caption" component="span" className={styles.file}>
            {document.fileName}
          </Typography>
          {hasProblems && (
            <Typography variant="caption" component="span" className={styles.problemCount}>
              {vystupy.problemCount(document.problems.length)}
            </Typography>
          )}
        </div>
        <div className={styles.actions}>
          <Button onClick={handleCopy} data-copy={copyState} data-testid={`${testId}--copy`}>
            {COPY_LABEL[copyState]}
          </Button>
          <Button component="a" href={markdownHref} download data-testid={`${testId}--md`}>
            {vystupy.downloadMd}
          </Button>
          <Button
            component="a"
            href={hasProblems ? undefined : pdfHref}
            download
            disabled={hasProblems}
            data-testid={`${testId}--pdf`}
          >
            {vystupy.downloadPdf}
          </Button>
          {template.googleUrl && (
            <Button onClick={handleRefresh} disabled={refreshDisabled} data-testid={`${testId}--refresh`}>
              {refreshing ? vystupy.refreshing : vystupy.refreshOne}
            </Button>
          )}
          <Button onClick={handleToggle} aria-expanded={open} data-testid={`${testId}--toggle`}>
            {open ? vystupy.hide : vystupy.show}
          </Button>
        </div>
      </div>

      <Typography variant="caption" component="p" className={styles.origin} data-google={template.fromGoogle}>
        {template.fromGoogle
          ? vystupy.templateFromGoogle(template.uploadedAt)
          : vystupy.templateUploaded(template.uploadFilename, template.uploadedAt)}
        {template.googleUrl && (
          <>
            {' · '}
            <a href={template.googleUrl} target="_blank" rel="noreferrer">
              {vystupy.openInGoogle}
            </a>
          </>
        )}
      </Typography>

      {hasProblems && (
        <ul className={styles.problems} data-testid={`${testId}--problems`}>
          {document.problems.map((problem, index) => (
            <li key={`${problem.code}-${problem.line ?? 'x'}-${index}`}>{vystupy.problemLine(problem.line, problem.detail)}</li>
          ))}
        </ul>
      )}

      {open && (
        <pre className={styles.markdown} data-testid={`${testId}--markdown`}>
          {document.markdown}
        </pre>
      )}
    </li>
  )
})
