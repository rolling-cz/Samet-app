import { useCallback, useRef } from 'react'
import { useLeaveGuard } from '@/core/hooks/useLeaveGuard'
import { dotaznik } from '@/locales/cs/dotaznik'

/** Which questions hold a value the server does not have; leaving the character with any asks first (§6.4). */
export const useUnsavedQuestions = () => {
  const unsavedRef = useRef(new Set<string>())
  const hasUnsavedRef = useRef(() => unsavedRef.current.size > 0)

  const handleUnsavedChange = useCallback((questionId: string, isUnsaved: boolean) => {
    if (isUnsaved) unsavedRef.current.add(questionId)
    else unsavedRef.current.delete(questionId)
  }, [])

  useLeaveGuard(hasUnsavedRef, dotaznik.unsavedLeave)

  return handleUnsavedChange
}
