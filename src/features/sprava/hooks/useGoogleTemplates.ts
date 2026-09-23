'use client'

import { useCallback, useState, type MouseEvent } from 'react'
import { runPath } from '@/core'
import { sprava } from '@/locales/cs/sprava'
import { errorMessage } from '@/utils/error-message'
import { googleTemplatesPath } from '../constants/google-download'
import { UPLOAD_FIELDS } from '../constants/upload-fields'
import type { GoogleDownloadResult } from '../types/google-download'

export type GoogleTemplatesState =
  | { _type: 'idle' }
  | { _type: 'pending' }
  | { _type: 'done'; result: GoogleDownloadResult; zip?: File }
  | { _type: 'error'; message: string }

const toFile = (base64: string, name: string): File => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)

  return new File([bytes], name, { type: 'application/zip' })
}

/**
 * „Načíst z Google": sends the chosen `.xlsx` to the download route and keeps
 * the zip it returns. Nothing is stored anywhere until the ordinary Check /
 * Save, which carries the zip like a hand-picked file.
 */
export const useGoogleTemplates = (runId: string) => {
  const [state, setState] = useState<GoogleTemplatesState>({ _type: 'idle' })

  const handleFetch = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      const { form } = event.currentTarget
      if (!form) return

      const config = new FormData(form).get(UPLOAD_FIELDS.config)
      const data = new FormData()
      if (config instanceof File) data.set(UPLOAD_FIELDS.config, config)

      setState({ _type: 'pending' })
      try {
        const response = await fetch(googleTemplatesPath(runPath(runId)), { method: 'POST', body: data })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const result = (await response.json()) as GoogleDownloadResult
        setState({
          _type: 'done',
          result,
          zip: result._type === 'ready' && result.report.okCount > 0 ? toFile(result.zipBase64, result.zipName) : undefined,
        })
      } catch (cause) {
        setState({ _type: 'error', message: sprava.google.requestFailed(errorMessage(cause)) })
      }
    },
    [runId],
  )

  const handleDiscard = useCallback(() => setState({ _type: 'idle' }), [])

  return { state, zip: state._type === 'done' ? state.zip : undefined, handleFetch, handleDiscard }
}
