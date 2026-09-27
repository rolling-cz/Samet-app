import { describe, expect, it } from 'vitest'
import { MAX_FILL_PASSES } from '../constants/fill-limits'
import { fillTemplate } from './fill-template'

const fill = (markdown: string, blocks: Record<string, string> = {}, variables: Record<string, string> = {}) =>
  fillTemplate({ markdown, blockTexts: new Map(Object.entries(blocks)), variables })

describe('fillTemplate', () => {
  it('nahradí značku textem vybrané varianty', () => {
    const result = fill('Úvod.\n\n{BLOK B_Marie_1_Historie_1}\n', {
      B_Marie_1_Historie_1: 'Pořídila si kocoura.',
    })

    expect(result.markdown).toBe('Úvod.\n\nPořídila si kocoura.\n')
    expect(result.problems).toEqual([])
  })

  it('nahradí i značku s escapy z exportu Google Docs, beze zbytku', () => {
    const result = fill('{BLOK B\\_Marie\\_1\\_Historie\\_1} a {PRIJMENI}', { B_Marie_1_Historie_1: 'Kocour.' }, { PRIJMENI: 'Balážová' })

    expect(result.markdown).toBe('Kocour. a Balážová\n')
    expect(result.problems).toEqual([])
  })

  it('prázdný text varianty nechá po značce jen jednu prázdnou řádku', () => {
    const result = fill('Před.\n\n{BLOK B_Prazdny}\n\nPo.\n', { B_Prazdny: '' })

    expect(result.markdown).toBe('Před.\n\nPo.\n')
    expect(result.problems).toEqual([])
  })

  it('rozbalí zanořené bloky ve smyčce', () => {
    const result = fill('{BLOK A}', {
      A: 'první {BLOK B}',
      B: 'druhý {BLOK C}',
      C: 'třetí',
    })

    expect(result.markdown).toBe('první druhý třetí\n')
    expect(result.passes).toBe(3)
    expect(result.problems).toEqual([])
  })

  it('cyklus mezi bloky zastaví stropem průchodů, nezacyklí se', () => {
    const result = fill('{BLOK A}', { A: '{BLOK B}', B: '{BLOK A}' })

    expect(result.passes).toBe(MAX_FILL_PASSES)
    expect(result.problems.map((problem) => problem.code)).toContain('too_many_passes')
  })

  it('blok bez vybrané varianty hlásí a značku nechá stát', () => {
    const result = fill('{BLOK B_Chybi}')

    expect(result.problems).toHaveLength(1)
    expect(result.problems[0]).toMatchObject({ code: 'unknown_block', raw: '{BLOK B_Chybi}', line: 1 })
    expect(result.markdown).toContain('{BLOK B_Chybi}')
  })

  it('dosadí proměnné a neznámou nahlásí', () => {
    const result = fill('{JMENO} {PRIJMENI}, {VEK}', {}, { JMENO: 'Marie', PRIJMENI: 'Balážová' })

    expect(result.markdown).toBe('Marie Balážová, {VEK}\n')
    expect(result.problems).toHaveLength(1)
    expect(result.problems[0]?.code).toBe('unknown_variable')
  })

  it('hlásí zavírací značku jako syntaktickou chybu', () => {
    const result = fill('{BLOK A}text{/BLOK}', { A: 'x' })

    expect(result.problems.map((problem) => problem.code)).toContain('marker_syntax')
  })

  it('najde chybu i ve značce, která přišla až z textu varianty', () => {
    const result = fill('{BLOK A}', { A: 'text {/BLOK}' })

    expect(result.problems.map((problem) => problem.code)).toContain('marker_syntax')
  })

  it('stejnou značku dvakrát nahradí a nahlásí jen jednou', () => {
    const result = fill('{BLOK B_Chybi} a {BLOK B_Chybi}')

    expect(result.problems).toHaveLength(1)
  })

  it('diakritika v textu varianty projde beze změny', () => {
    const result = fill('{BLOK A}', { A: 'Příliš žluťoučký kůň úpěl ďábelské ódy.' })

    expect(result.markdown).toBe('Příliš žluťoučký kůň úpěl ďábelské ódy.\n')
  })

  it('text mimo značky se nemění', () => {
    const markdown = '# Nadpis\n\nPevný odstavec s `kódem` a **tučným** textem.\n'

    expect(fill(markdown).markdown).toBe(markdown)
  })
})

describe('fillTemplate — {ZIVOTOPIS} (§8.2)', () => {
  const entry = (year: number, text: string, order: number) => ({ year, text, order })

  const fillWithBiography = (
    markdown: string,
    blocks: Record<string, string>,
    entries: Record<string, ReturnType<typeof entry>[]>,
    biographyOnly: string[] = [],
    variables: Record<string, string> = {},
  ) =>
    fillTemplate({
      markdown,
      blockTexts: new Map(Object.entries(blocks)),
      variables,
      biography: { entries: new Map(Object.entries(entries)), biographyOnly: new Set(biographyOnly) },
    })

  it('vypíše body rozvinutých bloků a bloků jen pro životopis, seřazené rokem a řádkem', () => {
    const result = fillWithBiography(
      '{BLOK B_Vedouci}\n\n## Životopis\n\n{ZIVOTOPIS}\n',
      { B_Vedouci: 'Stal se vedoucím.', B_Vera: '' },
      {
        B_Vedouci: [entry(1985, 'Zaučuje se.', 18), entry(1986, 'Je vedoucí.', 19)],
        B_Vera: [entry(1985, 'Umírá Věra.', 28)],
      },
      ['B_Vera'],
    )

    expect(result.problems).toEqual([])
    expect(result.markdown).toBe(
      'Stal se vedoucím.\n\n## Životopis\n\n**1985** Zaučuje se.\\\n**1985** Umírá Věra.\\\n**1986** Je vedoucí.\n',
    )
  })

  it('body bloku zanořeného v nevybrané variantě se nevypíšou', () => {
    // B_Uvnitr stands only in a variant that lost, so its marker never appears.
    const result = fillWithBiography(
      '{BLOK B_Venku}\n\n{ZIVOTOPIS}',
      { B_Venku: 'Vyhrála varianta bez zanoření.', B_Uvnitr: 'Nikdy.' },
      { B_Uvnitr: [entry(1985, 'Nemá se vypsat.', 5)] },
    )

    expect(result.markdown).not.toContain('Nemá se vypsat')
    expect(result.problems).toEqual([])
  })

  it('body zanořeného bloku, který se rozvinul, se vypíšou', () => {
    const result = fillWithBiography(
      '{BLOK B_Venku}\n\n{ZIVOTOPIS}',
      { B_Venku: 'Venku {BLOK B_Uvnitr}', B_Uvnitr: 'uvnitř.' },
      { B_Uvnitr: [entry(1985, 'Vypíše se.', 5)] },
    )

    expect(result.markdown).toBe('Venku uvnitř.\n\n**1985** Vypíše se.\n')
  })

  it('dosadí proměnné v bodech', () => {
    const result = fillWithBiography('{ZIVOTOPIS}', { B_Vera: '' }, { B_Vera: [entry(1985, '{JMENO} truchlí.', 2)] }, ['B_Vera'], {
      JMENO: 'Antonín',
    })

    expect(result.markdown).toBe('**1985** Antonín truchlí.\n')
    expect(result.problems).toEqual([])
  })

  it('bez bodů značka zmizí beze stopy', () => {
    const result = fill('Před.\n\n{ZIVOTOPIS}\n\nPo.\n')

    expect(result.markdown).toBe('Před.\n\nPo.\n')
    expect(result.problems).toEqual([])
  })

  it('šablona bez {ZIVOTOPIS} body nevypisuje', () => {
    const result = fillWithBiography('{BLOK B_Vera}', { B_Vera: 'Text.' }, { B_Vera: [entry(1985, 'Bod.', 2)] })

    expect(result.markdown).toBe('Text.\n')
  })
})
