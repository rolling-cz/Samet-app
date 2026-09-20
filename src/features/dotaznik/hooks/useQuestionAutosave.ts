import { useCallback, useEffect, useRef, useState } from 'react'
import type { AnswerView, QuestionView } from '@/computation'
import { useReportCompletion } from '@/core/hooks/useReportCompletion'
import { dotaznik } from '@/locales/cs/dotaznik'
import { errorMessage } from '@/utils/error-message'
import { saveAnswerAction } from '../actions/save-answer'
import { AUTOSAVE_DELAY_MS } from '../constants/autosave'
import type { AnswerDraft } from '../types/answer-draft'
import type { QuestionnaireContext } from '../types/questionnaire-context'
import type { SaveAnswerResult } from '../types/save-answer'
import { UNSAVED_STATUSES, type SaveStatus } from '../types/save-status'
import { draftFromAnswer, EMPTY_DRAFT } from '../utils/draft-from-answer'
import { toAnswerWrite } from '../utils/to-answer-write'

export type SaveTiming = 'now' | 'debounced'

/**
 * Autosave of one question (§6.4): a change saves this question and nothing
 * else. Saves run one at a time and the newest draft wins; a failed one keeps
 * its value in the field and can be retried.
 */
export const useQuestionAutosave = (question: QuestionView, context: QuestionnaireContext) => {
  const { runId, chapter, characterId, requestReason, onUnsavedChange } = context
  const reportCompletion = useReportCompletion()

  const [draft, setDraft] = useState<AnswerDraft>(() => draftFromAnswer(question.answer))
  const [saved, setSaved] = useState<AnswerView | undefined>(question.answer)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [failure, setFailure] = useState<string | undefined>()

  const draftRef = useRef(draft)
  const savedRef = useRef(saved)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const savingRef = useRef(false)
  const queuedRef = useRef(false)
  const mountedRef = useRef(true)

  const send = useCallback(
    async (current: AnswerDraft): Promise<SaveAnswerResult | undefined> => {
      const reason = requestReason === undefined ? undefined : await requestReason()
      if (requestReason !== undefined && reason === undefined) return undefined

      try {
        return await saveAnswerAction({ runId, chapter, characterId, questionId: question.id, draft: current, reason })
      } catch (cause) {
        return { _type: 'failed', message: errorMessage(cause) }
      }
    },
    [runId, chapter, characterId, question.id, requestReason],
  )

  const save = useCallback(async (): Promise<void> => {
    clearTimeout(timerRef.current)
    timerRef.current = undefined
    if (savingRef.current) {
      queuedRef.current = true

      return
    }

    const current = draftRef.current
    if (toAnswerWrite(question, current)._type === 'invalid') {
      setStatus('invalid')

      return
    }

    savingRef.current = true
    setStatus('saving')
    const result = await send(current)
    savingRef.current = false

    if (result === undefined) {
      // The org backed out of editing a released chapter: the field returns to what is stored.
      draftRef.current = draftFromAnswer(savedRef.current)
      queuedRef.current = false
      setDraft(draftRef.current)
      setStatus('idle')

      return
    }

    if (result._type === 'saved') {
      savedRef.current = result.answer
      setSaved(result.answer)
      setFailure(undefined)
      setStatus(draftRef.current === current ? 'saved' : 'dirty')
      reportCompletion(chapter, result.completion)
    } else {
      setFailure(result._type === 'failed' ? result.message : dotaznik.notSaved)
      setStatus('failed')
      // Nothing may be lost silently, not even a save that outlived its screen.
      if (!mountedRef.current) window.alert(dotaznik.lostSave(question.id))
    }

    if (queuedRef.current) {
      queuedRef.current = false
      void save()
    }
  }, [question, chapter, send, reportCompletion])

  const change = useCallback(
    (next: AnswerDraft, timing: SaveTiming) => {
      draftRef.current = next
      setDraft(next)
      setStatus('dirty')
      clearTimeout(timerRef.current)
      if (timing === 'now') void save()
      else timerRef.current = setTimeout(() => void save(), AUTOSAVE_DELAY_MS)
    },
    [save],
  )

  /** Handlers patch the newest draft, so they stay stable while the org types. */
  const update = useCallback(
    (patch: (current: AnswerDraft) => AnswerDraft, timing: SaveTiming) => change(patch(draftRef.current), timing),
    [change],
  )

  /** Leaving a field saves at once instead of waiting out the delay. */
  const flush = useCallback(() => {
    if (timerRef.current !== undefined) void save()
  }, [save])

  const retry = useCallback(() => void save(), [save])

  /** Back to „nobody answered yet" (§6.3) — an empty draft is no answer, so the stored one goes. */
  const cancel = useCallback(() => change(EMPTY_DRAFT, 'now'), [change])

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      if (timerRef.current !== undefined) void save()
    }
  }, [save])

  const isUnsaved = UNSAVED_STATUSES.includes(status)
  useEffect(() => {
    onUnsavedChange(question.id, isUnsaved)

    return () => onUnsavedChange(question.id, false)
  }, [question.id, isUnsaved, onUnsavedChange])

  return { draft, saved, status, failure, update, flush, retry, cancel }
}
