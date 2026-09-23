import { useCallback, useState, useTransition, type FormEvent, type MouseEvent } from 'react'
import { checkUpload } from '../actions/check-upload'
import { importUpload } from '../actions/import-upload'
import type { UploadReport } from '../types/upload-report'
import { UPLOAD_FIELDS } from '../constants/upload-fields'

/**
 * Checking is the primary action: the author uploads, reads the list, fixes the
 * sheet and repeats. Saving reuses the same form and stays disabled while the
 * last report has errors. A zip fetched from Google rides along with both;
 * where it goes among the templates does not matter — a Google template beats
 * an uploaded one by rule (`templateWins`).
 */
export const useUploadReport = (googleZip?: File) => {
  const withGoogleZip = useCallback(
    (data: FormData): FormData => {
      if (googleZip) data.append(UPLOAD_FIELDS.templates, googleZip)

      return data
    },
    [googleZip],
  )

  const [report, setReport] = useState<UploadReport | undefined>()
  const [pending, startTransition] = useTransition()

  // Not `report.ok`: a failed save (missing name, refused removal) says nothing about the file.
  const canSave = !pending && (report === undefined || report.errorCount === 0)

  const handleCheck = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = withGoogleZip(new FormData(event.currentTarget))
    startTransition(async () => setReport(await checkUpload(data)))
  }, [withGoogleZip])

  const handleSave = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const { form } = event.currentTarget
    if (!form) return

    const data = withGoogleZip(new FormData(form))
    startTransition(async () => setReport(await importUpload(data)))
  }, [withGoogleZip])

  return { report, pending, canSave, handleCheck, handleSave }
}
