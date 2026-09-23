/** Over the real fixture run, so the expectations are the engine's, not mine. */
import { describe, expect, it } from 'vitest'
import { runFixture } from '@/testing/fixture-run'
import { fillTemplate } from './fill-template'
import { blockTextsFor } from './block-texts'

const fixture = runFixture()

describe('blockTextsFor', () => {
  it('vrátí text vybrané varianty pro bloky postavy a kapitoly', () => {
    const { texts, undecided } = blockTextsFor(
      fixture.config,
      fixture.chapter1.state.selectedVariants,
      { kind: 'character', id: 'Marie' },
      2,
    )

    expect(undecided).toEqual([])
    expect([...texts.keys()]).toContain('B_Marie_1_Historie_1')
    // The block that only exists to decide a question has empty text (§8.2).
    expect(texts.get('B_Marie_1_Questions_1')).toBe('')
  })

  it('bloky jiné postavy ani jiné kapitoly nebere', () => {
    const { texts } = blockTextsFor(
      fixture.config,
      fixture.chapter1.state.selectedVariants,
      { kind: 'character', id: 'Marie' },
      2,
    )

    expect([...texts.keys()].every((id) => id.startsWith('B_Marie_1_'))).toBe(true)
  })

  it('umí i skupinu', () => {
    const { texts, undecided } = blockTextsFor(
      fixture.config,
      fixture.chapter1.state.selectedVariants,
      { kind: 'group', id: 'Funkcionari' },
      2,
    )

    expect(undecided).toEqual([])
    expect(texts.get('B_Funkcionari_1_Vedeni_1')).toBeTypeOf('string')
  })

  it('blok bez vybrané varianty ohlásí jako nerozhodnutý', () => {
    const { texts, undecided } = blockTextsFor(
      fixture.config,
      { characters: {}, groups: {} },
      { kind: 'character', id: 'Marie' },
      2,
    )

    expect(texts.size).toBe(0)
    expect(undecided).toContain('B_Marie_1_Historie_1')
  })

  it('naplní šablonu kapitoly 2 včetně zanořeného bloku, bez zbylé značky', () => {
    const { texts } = blockTextsFor(
      fixture.config,
      fixture.chapter1.state.selectedVariants,
      { kind: 'character', id: 'Marie' },
      2,
    )

    const result = fillTemplate({
      markdown: '# Marie\n\n{BLOK B_Marie_1_Historie_1}\n',
      blockTexts: texts,
      variables: {},
    })

    expect(result.problems).toEqual([])
    expect(result.markdown).not.toContain('{BLOK')
  })
})
