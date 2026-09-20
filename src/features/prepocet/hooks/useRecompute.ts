import { useCallback, useState, useTransition } from 'react'
import { recompute } from '../actions/recompute'
import type { RecomputeReport } from '../types/recompute-report'

export const useRecompute = (runId: string, chapter: number) => {
  const [report, setReport] = useState<RecomputeReport | undefined>()
  const [pending, startTransition] = useTransition()

  const handleRun = useCallback(() => {
    startTransition(async () => setReport(await recompute(runId, chapter)))
  }, [runId, chapter])

  return { report, pending, handleRun }
}
