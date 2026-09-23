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
