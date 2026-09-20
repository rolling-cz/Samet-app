import { useCallback, useRef, useState } from 'react'

type Settle = (reason: string | undefined) => void

/**
 * The soft lock of a released chapter (§3.2): the reason is asked once per
 * character, not per click — asked every time, it would be clicked through
 * blind. Every save still carries it into the audit.
 */
export const useReleasedReason = (isReleased: boolean) => {
  const [reason, setReason] = useState<string | undefined>()
  const [isAsking, setIsAsking] = useState(false)

  const reasonRef = useRef<string | undefined>(undefined)
  const waitingRef = useRef<Settle[]>([])

  const settle = useCallback((value: string | undefined) => {
    const waiting = waitingRef.current
    waitingRef.current = []
    setIsAsking(false)
    for (const resolve of waiting) resolve(value)
  }, [])

  const requestReason = useCallback((): Promise<string | undefined> => {
    if (reasonRef.current !== undefined) return Promise.resolve(reasonRef.current)
    setIsAsking(true)

    return new Promise((resolve) => waitingRef.current.push(resolve))
  }, [])

  const handleConfirm = useCallback(
    (text: string) => {
      reasonRef.current = text
      setReason(text)
      settle(text)
    },
    [settle],
  )

  const handleDismiss = useCallback(() => settle(undefined), [settle])

  return { requestReason: isReleased ? requestReason : undefined, reason, isAsking, handleConfirm, handleDismiss }
}
