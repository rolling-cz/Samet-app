'use client'

/** Upload form and the report it produces (§10.2). */
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { sprava } from '@/locales/cs/sprava'
import { UPLOAD_ACCEPT, UPLOAD_FIELDS } from '../../constants/upload-fields'
import { useGoogleTemplates } from '../../hooks/useGoogleTemplates'
import { useUploadReport } from '../../hooks/useUploadReport'
import { GoogleTemplates } from './components/GoogleTemplates/GoogleTemplates'
import { UploadReportView } from './components/UploadReportView/UploadReportView'
import styles from './UploadPanel.module.css'

interface UploadPanelProps {
  runId: string
  /** After the first computation an upload is an emergency fix (§6.5). */
  isConfigFrozen: boolean
}

export const UploadPanel = ({ runId, isConfigFrozen }: UploadPanelProps) => {
  const google = useGoogleTemplates(runId)
  const { report, pending, canSave, handleCheck, handleSave } = useUploadReport(google.zip)

  return (
    <Paper variant="outlined" component="section" className={styles.panel} data-testid="upload-panel">
      <Typography variant="h6" component="h2">
        {sprava.uploadTitle}
      </Typography>
      <Typography variant="body2" className={styles.hint}>
        {sprava.uploadHintBefore}
        <em>{sprava.uploadHintMenu}</em>
        {sprava.uploadHintMiddle}
        <code>{sprava.uploadHintFormat}</code>
        {sprava.uploadHintAfter}
      </Typography>

      {isConfigFrozen && (
        <Alert severity="warning" className={styles.frozen} data-testid="upload-panel--frozen">
          {sprava.frozenWarning(runId)}
        </Alert>
      )}

      <form className={styles.form} onSubmit={handleCheck} data-testid="upload-form">
        <input type="hidden" name={UPLOAD_FIELDS.runId} value={runId} />

        <label className={styles.fileField}>
          <Typography variant="subtitle2" component="span">
            {sprava.configLabel}
          </Typography>
          <input
            type="file"
            name={UPLOAD_FIELDS.config}
            onChange={google.handleDiscard}
            accept={UPLOAD_ACCEPT.config}
            className={styles.fileInput}
            data-testid="upload-form--config"
          />
        </label>

        <GoogleTemplates state={google.state} onFetch={google.handleFetch} onDiscard={google.handleDiscard} />

        <label className={styles.fileField}>
          <Typography variant="subtitle2" component="span">
            {sprava.templatesLabel}
          </Typography>
          <input
            type="file"
            name={UPLOAD_FIELDS.templates}
            accept={UPLOAD_ACCEPT.templates}
            multiple
            className={styles.fileInput}
            data-testid="upload-form--templates"
          />
          <Typography variant="caption" component="span" className={styles.hint}>
            {sprava.templatesHint}
          </Typography>
        </label>

        {/* Enforced on the server, so checking a file never asks for a reason. */}
        {isConfigFrozen && (
          <TextField
            name={UPLOAD_FIELDS.reason}
            label={sprava.reasonLabel}
            fullWidth
            multiline
            slotProps={{ htmlInput: { 'data-testid': 'upload-form--reason' } }}
          />
        )}

        <TextField
          name={UPLOAD_FIELDS.note}
          label={sprava.noteLabel}
          fullWidth
          slotProps={{ htmlInput: { 'data-testid': 'upload-form--note' } }}
        />

        <div className={styles.actions}>
          <Button type="submit" variant="contained" disabled={pending} data-testid="upload-form--check">
            {pending ? sprava.checking : sprava.check}
          </Button>
          <Button
            type="submit"
            variant="outlined"
            disabled={!canSave}
            formNoValidate
            onClick={handleSave}
            data-testid="upload-form--save"
          >
            {isConfigFrozen ? sprava.saveEmergency(runId) : sprava.save}
          </Button>
        </div>
      </form>

      {report && <UploadReportView report={report} />}
    </Paper>
  )
}
