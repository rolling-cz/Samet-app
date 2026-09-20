'use server'

import { revalidatePath } from 'next/cache'
import { confirmComputation, type ConfirmationOutcome } from '@/computation'
import { runPath } from '@/core'
import { readAuthor } from '@/core/services/auth-cookies'
import { prepocet } from '@/locales/cs/prepocet'
import { errorMessage } from '@/utils/error-message'

export type ConfirmReport = ConfirmationOutcome | { _type: 'failed'; message: string }

/** Makes the draft the computation the next chapter starts from; the chapter's state shows in the top bar. */
export const confirm = async (runId: string, computationId: string): Promise<ConfirmReport> => {
  const author = await readAuthor()
  if (author === '') return { _type: 'failed', message: prepocet.authorRequired }

  try {
    const outcome = await confirmComputation({ runId, computationId, author })
    if (outcome._type === 'confirmed') revalidatePath(runPath(runId), 'layout')

    return outcome
  } catch (cause) {
    return { _type: 'failed', message: errorMessage(cause) }
  }
}
