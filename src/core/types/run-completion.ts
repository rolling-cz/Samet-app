import type { CharacterCompletion } from '@/computation'

/** Completion per chapter number; a chapter that cannot open yet has no entry. */
export type RunCompletion = Readonly<Record<number, readonly CharacterCompletion[]>>
