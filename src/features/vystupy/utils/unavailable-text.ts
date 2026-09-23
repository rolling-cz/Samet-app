import type { DocumentSet } from '@/documents'
import { vystupy } from '@/locales/cs/vystupy'

/** Why a chapter's outputs cannot be produced, in the org's words. */
export const unavailableText = (set: Exclude<DocumentSet, { _type: 'ready' }>): string => {
  switch (set._type) {
    case 'blocked':
      return vystupy.blocked(set.missingChapter)
    case 'no_config':
      return vystupy.noConfig
    case 'config_unusable':
      return vystupy.configUnusable(set.filename, set.errors.length)
    case 'unknown_chapter':
      return vystupy.unknownChapter(set.chapter)
  }
}
