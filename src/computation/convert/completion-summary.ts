import type { CharacterCompletion, CompletionSummary } from '../types/completion'

/** „Vyplněno 14 / 23" — characters, not questions. */
export const completionSummary = (characters: readonly CharacterCompletion[]): CompletionSummary => ({
  done: characters.filter((character) => character.status === 'done').length,
  total: characters.length,
})
