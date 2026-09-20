import type { AnswerView, CharacterCompletion } from '@/computation'
import type { AnswerDraft } from './answer-draft'

/** One change of one question — never the whole form, which would undo a colleague's work (§6.4). */
export interface SaveAnswerRequest {
  runId: string
  chapter: number
  characterId: string
  questionId: string
  draft: AnswerDraft
  /** Why a released chapter is being edited; asked once per character and sent with every change (§3.2). */
  reason?: string
}

export type SaveAnswerResult =
  | {
      _type: 'saved'
      /** The answer as stored now; absent when the question is back to „nobody answered yet". */
      answer?: AnswerView
      /** The whole chapter, so the panel also picks up what colleagues entered meanwhile. */
      completion: CharacterCompletion[]
      /** Chapters the cascade marked; the top bar shows them. */
      touchedChapters?: number[]
    }
  | { _type: 'reason_required' }
  | { _type: 'failed'; message: string }
