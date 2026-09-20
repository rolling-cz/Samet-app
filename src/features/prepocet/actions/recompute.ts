'use server'

import { revalidatePath } from 'next/cache'
import { runComputation } from '@/computation'
import { runPath } from '@/core'
import { readAuthor } from '@/core/services/auth-cookies'
import { prepocet } from '@/locales/cs/prepocet'
import { errorMessage } from '@/utils/error-message'
import type { RecomputeReport } from '../types/recompute-report'

/** A dry-run: a new draft version every time. Whatever goes wrong comes back as data, never as a broken page. */
export const recompute = async (runId: string, chapter: number): Promise<RecomputeReport> => {
  const author = await readAuthor()
  if (author === '') return { _type: 'failed', message: prepocet.authorRequired }

  try {
    const outcome = await runComputation({ runId, chapter, author })
    // The first computation freezes the config, which Správa shows.
    if (outcome._type === 'computed') revalidatePath(runPath(runId), 'layout')

    return outcome
  } catch (cause) {
    return { _type: 'failed', message: errorMessage(cause) }
  }
}
