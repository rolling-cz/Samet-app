import { describe, expect, it } from 'vitest'
import { adminRoute, chapterRoute, runHomeRoute, sectionRoute } from './constants/routes'
import type { ChapterSummary } from './types/chapter-summary'
import { defaultChapterNumber } from './utils/default-chapter-number'
import { parseChapterNumber } from './utils/parse-chapter-number'
import { parseRunLocation } from './utils/parse-run-location'
import { switchRunRoute } from './utils/switch-run-route'

const RUN_A = '2026-09-12_A'
const RUN_B = '2026-09-12_B'

const chaptersWith = (...statuses: ChapterSummary['status'][]): ChapterSummary[] =>
  statuses.map((status, index) => ({ number: index + 1, status, isTouched: false }))

describe('chapterRoute', () => {
  it('puts run, chapter, section and character into the path', () => {
    expect(chapterRoute(RUN_A, 2, 'postavy', 'Marie')).toBe('/beh/2026-09-12_A/kapitola/2/postavy/Marie')
    expect(chapterRoute(RUN_A, 1, 'prepocet')).toBe('/beh/2026-09-12_A/kapitola/1/prepocet')
  })

  it('carries diacritics in a character ID through the address and back', () => {
    const route = chapterRoute(RUN_A, 1, 'postavy', 'Věra')
    const segments = route.split('/').slice(3)

    expect(parseRunLocation(segments).characterId).toBe('Věra')
  })

  it('keeps Správa out of the chapter', () => {
    expect(sectionRoute(RUN_A, 'sprava', 2)).toBe(adminRoute(RUN_A))
    expect(sectionRoute(RUN_A, 'vystupy', 2)).toBe('/beh/2026-09-12_A/kapitola/2/vystupy')
  })
})

describe('parseRunLocation', () => {
  it.each([
    [['kapitola', '2', 'postavy', 'Marie'], { chapter: 2, section: 'postavy', characterId: 'Marie' }],
    [['kapitola', '2', 'postavy'], { chapter: 2, section: 'postavy' }],
    [['kapitola', '3', 'vystupy'], { chapter: 3, section: 'vystupy' }],
    [['kapitola', '3'], { chapter: 3 }],
    [['sprava'], { section: 'sprava' }],
    [['sprava', 'archiv', 'abc'], { section: 'sprava' }],
    [['postavy'], { section: 'postavy' }],
    [[], {}],
    [['kapitola', 'x', 'postavy'], { section: 'postavy' }],
    [['kapitola', '2', 'neznama'], { chapter: 2 }],
  ])('%j', (segments, expected) => {
    expect(parseRunLocation(segments)).toEqual(expected)
  })

  it('reads a character only in Postavy', () => {
    expect(parseRunLocation(['kapitola', '1', 'skupiny', 'Marie'])).toEqual({ chapter: 1, section: 'skupiny' })
  })

  it('leaves a segment that does not decode as it is', () => {
    expect(parseRunLocation(['kapitola', '1', 'postavy', '%E0%A4%A']).characterId).toBe('%E0%A4%A')
  })
})

describe('parseChapterNumber', () => {
  it.each([
    ['1', 1],
    ['12', 12],
    ['0', undefined],
    ['02', undefined],
    ['-1', undefined],
    ['1.5', undefined],
    ['', undefined],
    [undefined, undefined],
  ])('%s → %s', (segment, expected) => {
    expect(parseChapterNumber(segment)).toBe(expected)
  })
})

describe('defaultChapterNumber', () => {
  it('opens the first chapter that is not released', () => {
    expect(defaultChapterNumber(chaptersWith('in_progress', 'in_progress', 'in_progress'))).toBe(1)
    expect(defaultChapterNumber(chaptersWith('released', 'computed', 'in_progress'))).toBe(2)
  })

  it('opens the last chapter once all are released', () => {
    expect(defaultChapterNumber(chaptersWith('released', 'released', 'released'))).toBe(3)
  })

  it('does not depend on the order of the rows', () => {
    expect(defaultChapterNumber([...chaptersWith('released', 'in_progress', 'in_progress')].reverse())).toBe(2)
  })
})

describe('switchRunRoute', () => {
  it('keeps section and chapter and drops the character', () => {
    expect(switchRunRoute({ section: 'postavy', chapter: 2, characterId: 'Marie' }, RUN_B)).toBe(
      chapterRoute(RUN_B, 2, 'postavy'),
    )
  })

  it('stays in Správa', () => {
    expect(switchRunRoute({ section: 'sprava' }, RUN_B)).toBe(adminRoute(RUN_B))
  })

  it('lets the other run pick its default chapter when the address has none', () => {
    expect(switchRunRoute({}, RUN_B)).toBe(runHomeRoute(RUN_B))
  })
})
