'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Asks before the org leaves with something unsaved — by a link inside the app
 * or by closing the tab. `hasUnsaved` is a ref so the check reads the state of
 * the very click, not of the last render.
 *
 * The listener sits on the document in the capture phase: the App Router has no
 * navigation guard, and this runs before any link's own handler.
 */
export const useLeaveGuard = (hasUnsaved: RefObject<() => boolean>, message: string): void => {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!hasUnsaved.current()) return
      if (!(event.target instanceof Element) || event.target.closest('a[href]') === null) return
      if (window.confirm(message)) return

      event.preventDefault()
      event.stopPropagation()
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsaved.current()) event.preventDefault()
    }

    document.addEventListener('click', handleClick, true)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('click', handleClick, true)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsaved, message])
}
