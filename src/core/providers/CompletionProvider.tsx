'use client'

import { useCallback, useState, type ReactNode } from 'react'
import { CompletionContext, ReportCompletionContext, type ReportChapterCompletion } from './completion-context'
import type { RunCompletion } from '../types/run-completion'

interface CompletionProviderProps {
  /** Loaded by the run layout; a new object (layout refresh) replaces whatever was reported since. */
  initial: RunCompletion
  children: ReactNode
}

/**
 * Completion shared by the left panel and the questionnaire (§6.4). The panel
 * lives in the run layout, which a navigation does not reload — so the
 * questionnaire reports what each save and each opened character brought back,
 * and the indicators follow without a page load.
 */
export const CompletionProvider = ({ initial, children }: CompletionProviderProps) => {
  const [loaded, setLoaded] = useState(initial)
  const [completion, setCompletion] = useState(initial)

  if (loaded !== initial) {
    setLoaded(initial)
    setCompletion(initial)
  }

  const report = useCallback<ReportChapterCompletion>(
    (chapter, characters) => setCompletion((current) => ({ ...current, [chapter]: characters })),
    [],
  )

  return (
    <ReportCompletionContext.Provider value={report}>
      <CompletionContext.Provider value={completion}>{children}</CompletionContext.Provider>
    </ReportCompletionContext.Provider>
  )
}
