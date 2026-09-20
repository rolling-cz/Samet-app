import type { ChapterStaleness } from '../types/chapter-staleness'

const latest = (dates: readonly Date[]): Date | undefined => {
  let newest: Date | undefined
  for (const date of dates) {
    if (newest === undefined || date > newest) newest = date
  }

  return newest
}

export const chapterStaleness = (computedAt: readonly Date[], answersChangedAt: readonly Date[]): ChapterStaleness => {
  const computed = latest(computedAt)
  if (!computed) return { _type: 'not_computed' }

  const changed = latest(answersChangedAt)
  if (!changed || changed <= computed) return { _type: 'fresh' }

  return { _type: 'stale', computedAt: computed.toISOString(), answersChangedAt: changed.toISOString() }
}
