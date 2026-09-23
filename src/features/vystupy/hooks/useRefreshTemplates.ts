'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { refreshTemplates } from '../actions/refresh-templates'
import type { RefreshResult } from '../types/refresh-result'

/** The key of „Obnovit vše"; any other key is an owner ID. */
export const REFRESH_ALL = '*'

/**
 * „Obnovit z Google" for one document or the whole chapter. The screen reloads
 * from the server afterwards, so the documents shown are always the ones the
 * download would give — nothing is patched in the browser.
 */
export const useRefreshTemplates = (runId: string, chapter: number) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [pendingKey, setPendingKey] = useState<string | undefined>()
  const [result, setResult] = useState<RefreshResult | undefined>()

  const refresh = useCallback(
    (ownerId?: string) => {
      setPendingKey(ownerId ?? REFRESH_ALL)
      startTransition(async () => {
        const outcome = await refreshTemplates(runId, chapter, ownerId)
        setResult(outcome)
        if (outcome._type === 'done' && outcome.archived) router.refresh()
      })
    },
    [runId, chapter, router],
  )

  return { refresh, result, pendingKey: pending ? pendingKey : undefined }
}
