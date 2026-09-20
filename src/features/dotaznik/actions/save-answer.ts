'use server'

import { revalidatePath } from 'next/cache'
import { runPath } from '@/core'
import { readAuthor } from '@/core/services/auth-cookies'
import { dotaznik } from '@/locales/cs/dotaznik'
import { errorMessage } from '@/utils/error-message'
import { saveAnswer } from '../services/save-answer'
import type { SaveAnswerRequest, SaveAnswerResult } from '../types/save-answer'

/** The author comes from the cookie, never from the form. A failure is data: the field keeps its value and offers a retry. */
export const saveAnswerAction = async (request: SaveAnswerRequest): Promise<SaveAnswerResult> => {
  const author = await readAuthor()
  if (author === '') return { _type: 'failed', message: dotaznik.errorAuthor }

  try {
    const result = await saveAnswer(request, author)
    // Touched chapters show in the top bar, which lives in the run layout.
    if (result._type === 'saved' && (result.touchedChapters?.length ?? 0) > 0) {
      revalidatePath(runPath(request.runId), 'layout')
    }

    return result
  } catch (cause) {
    return { _type: 'failed', message: errorMessage(cause) }
  }
}
