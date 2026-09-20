import { loadChapterCompletion, type CharacterCompletion } from '@/computation'
import type { RunCompletion } from '../types/run-completion'

/** What the left panel starts from: one pass per chapter (§6.4). */
export const loadRunCompletion = async (runId: string, chapterNumbers: readonly number[]): Promise<RunCompletion> => {
  const completion: Record<number, readonly CharacterCompletion[]> = {}

  for (const chapter of chapterNumbers) {
    const loaded = await loadChapterCompletion(runId, chapter)
    if (loaded._type === 'ready') completion[chapter] = loaded.characters
  }

  return completion
}
