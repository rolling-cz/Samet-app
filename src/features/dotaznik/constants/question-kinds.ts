import type { AskedQuestionType } from '@/computation'

/** Question types answered by one number (§6.7). */
export const DIRECT_TYPES: readonly AskedQuestionType[] = Object.freeze(['scale_direct', 'resource_direct'])

/** Question types answered by exactly one of the listed options. */
export const SINGLE_CHOICE_TYPES: readonly AskedQuestionType[] = Object.freeze(['single', 'poll-answer'])
