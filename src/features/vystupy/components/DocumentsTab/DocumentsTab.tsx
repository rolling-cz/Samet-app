'use client'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useCallback } from 'react'
import { MERGED_PDF_NAME } from '@/documents/constants/output-names'
import { vystupy } from '@/locales/cs/vystupy'
import { outputFilePath } from '../../constants/output-file'
import { REFRESH_ALL, useRefreshTemplates } from '../../hooks/useRefreshTemplates'
import type { OutputsView } from '../../types/outputs-view'
import { DocumentItem } from '../DocumentItem/DocumentItem'
import { RefreshNotice } from '../RefreshNotice/RefreshNotice'
import styles from './DocumentsTab.module.css'

interface DocumentsTabProps {
  view: OutputsView
}

interface BundleLinkProps {
  href: string
  label: string
  disabled: boolean
  testId: string
  primary?: boolean
}

/** A download, not a navigation: `<a download>` keeps the screen where it is. */
const BundleLink = ({ href, label, disabled, testId, primary = false }: BundleLinkProps) => (
  <Button
    component="a"
    href={disabled ? undefined : href}
    download
    disabled={disabled}
    variant={primary ? 'contained' : 'outlined'}
    data-testid={testId}
  >
    {label}
  </Button>
)

/**
 * The `.md` of every owner, always — it is what the org reads and corrects —
 * and the printable bundles only once nothing in them has a problem (§8.1).
 */
export const DocumentsTab = ({ view }: DocumentsTabProps) => {
  const { runId, chapter, documentChapter, documents, blockers, missingTemplateLabels } = view
  const pathOf = (fileName: string) => outputFilePath(runId, chapter, fileName)
  const hasCharacters = documents.some((document) => document.owner.kind === 'character')
  const hasGroups = documents.some((document) => document.owner.kind === 'group')

  const { refresh, result, pendingKey } = useRefreshTemplates(runId, documentChapter)
  const handleRefreshAll = useCallback(() => refresh(), [refresh])

  return (
    <div className={styles.tab} data-testid="outputs--documents">
      <div className={styles.bundles}>
        <BundleLink
          href={pathOf(view.zipName)}
          label={vystupy.downloadZip}
          disabled={blockers.zip !== undefined}
          testId="outputs--zip"
          primary
        />
        {hasCharacters && (
          <BundleLink
            href={pathOf(MERGED_PDF_NAME.character)}
            label={vystupy.downloadCharactersPdf}
            disabled={blockers.character !== undefined}
            testId="outputs--pdf-character"
          />
        )}
        {hasGroups && (
          <BundleLink
            href={pathOf(MERGED_PDF_NAME.group)}
            label={vystupy.downloadGroupsPdf}
            disabled={blockers.group !== undefined}
            testId="outputs--pdf-group"
          />
        )}
        {view.canRefresh && (
          <Button
            variant="outlined"
            onClick={handleRefreshAll}
            disabled={pendingKey !== undefined}
            data-testid="outputs--refresh-all"
          >
            {pendingKey === REFRESH_ALL ? vystupy.refreshing : vystupy.refreshAll}
          </Button>
        )}
        <Typography variant="caption" className={styles.count}>
          {vystupy.documentCount(documents.length)}
        </Typography>
      </div>

      {result && <RefreshNotice result={result} />}
      {blockers.zip !== undefined && documents.length > 0 && (
        <Alert severity="warning" data-testid="outputs--not-printable">
          {vystupy.notPrintable[blockers.zip]}
        </Alert>
      )}
      {missingTemplateLabels.length > 0 && (
        <Alert severity="error" data-testid="outputs--missing-templates">
          {vystupy.missingTemplates(missingTemplateLabels.join(', '))}
        </Alert>
      )}

      {documents.length === 0 ? (
        <Typography variant="body2" className={styles.count}>
          {vystupy.empty}
        </Typography>
      ) : (
        <ul className={styles.list}>
          {documents.map((document) => (
            <DocumentItem
              key={document.fileName}
              document={document}
              markdownHref={pathOf(document.fileName)}
              pdfHref={pathOf(document.pdfName)}
              refreshing={pendingKey === document.owner.id || pendingKey === REFRESH_ALL}
              refreshDisabled={pendingKey !== undefined}
              onRefresh={refresh}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
