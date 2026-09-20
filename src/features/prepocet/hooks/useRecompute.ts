import { useCallback, useState, useTransition } from 'react'
import { confirm, type ConfirmReport } from '../actions/confirm'
import { recompute } from '../actions/recompute'
import type { RecomputeReport } from '../types/recompute-report'

export const useRecompute = (runId: string, chapter: number) => {
  const [report, setReport] = useState<RecomputeReport | undefined>()
  const [confirmation, setConfirmation] = useState<ConfirmReport | undefined>()
  const [pending, startTransition] = useTransition()

  const handleRun = useCallback(() => {
    startTransition(async () => {
      setConfirmation(undefined)
      setReport(await recompute(runId, chapter))
    })
  }, [runId, chapter])

  const computationId = report?._type === 'computed' ? report.computationId : undefined

  const handleConfirm = useCallback(() => {
    if (computationId === undefined) return
    startTransition(async () => setConfirmation(await confirm(runId, computationId)))
  }, [runId, computationId])

  return { report, confirmation, pending, handleRun, handleConfirm }
}
