import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react'
import { common } from '@/locales/cs/common'
import { dotaznik } from '@/locales/cs/dotaznik'

interface ReleasedEditDialogProps {
  runId: string
  chapter: number
  onConfirm: (reason: string) => void
  onDismiss: () => void
}

/** The soft lock names the run and the chapter, so an edit never lands in the other run by habit (§3.3). Mount only while open. */
export const ReleasedEditDialog = ({ runId, chapter, onConfirm, onDismiss }: ReleasedEditDialogProps) => {
  const [reason, setReason] = useState('')

  const trimmed = reason.trim()

  const handleReason = useCallback((event: ChangeEvent<HTMLInputElement>) => setReason(event.target.value), [])

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault()
      if (trimmed !== '') onConfirm(trimmed)
    },
    [trimmed, onConfirm],
  )

  return (
    <Dialog open onClose={onDismiss} data-testid="released-edit-dialog">
      <form onSubmit={handleSubmit}>
        <DialogTitle>{dotaznik.releasedDialogTitle(chapter, runId)}</DialogTitle>
        <DialogContent>
          <DialogContentText>{dotaznik.releasedDialogBody}</DialogContentText>
          <TextField
            label={dotaznik.releasedReasonLabel}
            value={reason}
            onChange={handleReason}
            required
            autoFocus
            fullWidth
            multiline
            minRows={2}
            slotProps={{ htmlInput: { 'data-testid': 'released-edit-dialog--reason' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onDismiss} color="inherit">
            {common.cancel}
          </Button>
          <Button type="submit" variant="contained" disabled={trimmed === ''} data-testid="released-edit-dialog--submit">
            {dotaznik.releasedConfirm}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
