'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type CopyState = 'idle' | 'copied' | 'failed'

/** How long „Zkopírováno" stays before the button reads normally again. */
const FEEDBACK_MS = 2000

/**
 * „Kopírovat do schránky" (§10.5): the org switches tabs and presses Ctrl+V.
 * No endpoint — the text is already on the page.
 */
export const useCopyToClipboard = (text: string) => {
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = useCallback(async () => {
    clearTimeout(timer.current)
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      // Insecure context or a denied permission; the .md download still works.
      setState('failed')
    }
    timer.current = setTimeout(() => setState('idle'), FEEDBACK_MS)
  }, [text])

  return { state, copy }
}
