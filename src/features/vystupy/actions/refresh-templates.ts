'use server'

import { readAuthor } from '@/core/services/auth-cookies'
import { errorMessage } from '@/utils/error-message'
import { refreshGoogleTemplates } from '../services/refresh-google-templates'
import type { RefreshResult } from '../types/refresh-result'

/** The name comes from the „Kdo jsi?" cookie, never from the client (§3.1). */
export const refreshTemplates = async (runId: string, chapter: number, ownerId?: string): Promise<RefreshResult> => {
  const author = await readAuthor()
  if (author === '') return { _type: 'author_required' }

  try {
    return await refreshGoogleTemplates({ runId, chapter, ownerId, author })
  } catch (cause) {
    return { _type: 'failed', message: errorMessage(cause) }
  }
}
