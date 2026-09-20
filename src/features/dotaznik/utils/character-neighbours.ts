import type { CompletionStatus } from '@/computation'
import type { CharacterNeighbours } from '../types/character-neighbours'

/**
 * `order` is the panel's order. „Další nevyplněná" looks past the end and
 * starts over, so the last papers of the pile are found from anywhere.
 */
export const characterNeighbours = (
  order: readonly string[],
  currentId: string,
  statusOf: (characterId: string) => CompletionStatus | undefined,
): CharacterNeighbours => {
  const index = order.indexOf(currentId)
  if (index === -1) return {}

  const neighbours: CharacterNeighbours = {}
  const previous = order[index - 1]
  const next = order[index + 1]
  if (previous !== undefined) neighbours.previous = previous
  if (next !== undefined) neighbours.next = next

  for (let step = 1; step < order.length; step += 1) {
    const candidate = order[(index + step) % order.length]
    if (candidate === undefined || statusOf(candidate) === 'done') continue
    neighbours.nextUnfilled = candidate
    break
  }

  return neighbours
}
