/** The optional `Templates` sheet and the ownership guard on markers (§10.2, §8.4). */
import { describe, expect, it } from 'vitest'
import { TEMPLATE_SOURCE_COLUMNS, TEMPLATES_SHEET } from './constants/sheets'
import { importWorkbook } from './import-config'
import { buildWorkbook, defaultTemplates } from './testing/build-workbook'
import type { ImportResult } from './types/import-result'

const ID = (suffix: string) => `1AbCdEfGhIjKlMnOpQrStUvWxYz_${suffix}`
const docUrl = (suffix: string, tab = 't.0') =>
  `https://docs.google.com/document/d/${ID(suffix)}/edit${tab === '' ? '' : `?tab=${tab}`}`

const sheet = (...rows: [string, string, string][]) => ({
  extra: { [TEMPLATES_SHEET]: [[...TEMPLATE_SOURCE_COLUMNS], ...rows] },
})

const ALL_OWNERS: [string, string, string][] = [
  ['Marie', '2', docUrl('marie')],
  ['Mirek', '2', docUrl('mirek')],
  ['SrdceParty', '2', docUrl('srdce')],
]

const run = (parts: ReturnType<typeof sheet>): ImportResult => importWorkbook(buildWorkbook(parts))
const codes = (result: ImportResult) => result.issues.map((issue) => issue.code)
const byCode = (result: ImportResult, code: string) => result.issues.filter((issue) => issue.code === code)

describe('list Templates', () => {
  it('bez listu se o Googlu nic nehlásí', () => {
    const result = importWorkbook(buildWorkbook())

    expect(result.config.templateSources).toBeUndefined()
    expect(codes(result)).not.toContain('owner_without_template_url')
  })

  it('platné řádky projdou bez hlášek a nesou ID dokumentu i karty', () => {
    const result = run(sheet(...ALL_OWNERS))

    expect(codes(result).filter((code) => code.includes('template'))).toEqual([])
    expect(result.config.templateSources?.[0]).toMatchObject({
      owner: { kind: 'character', id: 'Marie' },
      chapter: 2,
      ref: { documentId: ID('marie'), tabId: 't.0' },
    })
    expect(result.config.templateSources?.[2]?.owner).toEqual({ kind: 'group', id: 'SrdceParty' })
  })

  it('list nepřidá kapitolu', () => {
    expect(run(sheet(...ALL_OWNERS)).config.chapters).toEqual([2])
  })

  it('vlastník bez řádku je varování, ne chyba', () => {
    const result = run(sheet(ALL_OWNERS[0]!, ALL_OWNERS[1]!))
    const missing = byCode(result, 'owner_without_template_url')

    expect(missing.map((issue) => issue.value)).toEqual(['SrdceParty_2'])
    expect(missing[0]?.severity).toBe('warning')
  })

  it('adresa bez karty je varování', () => {
    const result = run(sheet(['Marie', '2', docUrl('marie', '')], ALL_OWNERS[1]!, ALL_OWNERS[2]!))

    expect(byCode(result, 'template_url_without_tab')[0]).toMatchObject({ severity: 'warning', location: { row: 2 } })
  })

  it('publikovaná stránka i tabulka jsou chyba s vlastní hláškou', () => {
    const result = run(
      sheet(
        ['Marie', '2', `https://docs.google.com/document/d/e/2PACX-${ID('x')}/pub`],
        ['Mirek', '2', `https://docs.google.com/spreadsheets/d/${ID('y')}/edit`],
        ALL_OWNERS[2]!,
      ),
    )
    const invalid = byCode(result, 'invalid_template_url')

    expect(invalid).toHaveLength(2)
    expect(invalid[0]?.message).toContain('/pub')
    expect(invalid[1]?.message).toContain('tabulka')
    expect(result.usable).toBe(false)
  })

  it('neznámý vlastník s „mysleli jste"', () => {
    const result = run(sheet(['Marei', '2', docUrl('marie')], ALL_OWNERS[1]!, ALL_OWNERS[2]!))

    expect(byCode(result, 'unknown_character')[0]).toMatchObject({ value: 'Marei', suggestion: 'Marie' })
  })

  it('kapitola, kterou konfigurace nemá', () => {
    const result = run(sheet(...ALL_OWNERS, ['Marie', '5', docUrl('marie5')]))

    expect(byCode(result, 'value_out_of_range')[0]?.value).toBe('5')
  })

  it('dvě adresy pro tutéž dvojici', () => {
    const result = run(sheet(...ALL_OWNERS, ['Marie', '2', docUrl('jina')]))

    expect(byCode(result, 'duplicate_template_source')[0]?.value).toBe('Marie_2')
  })

  it('stejný dokument i karta u dvou vlastníků je podezřelé', () => {
    const result = run(sheet(ALL_OWNERS[0]!, ['Mirek', '2', docUrl('marie')], ALL_OWNERS[2]!))

    expect(byCode(result, 'shared_template_url')[0]?.severity).toBe('warning')
  })

  it('vlastníka stačí napsat jednou, sloupec se doplní dolů', () => {
    const result = run(sheet(['Marie', '2', docUrl('marie')], ['', '2', docUrl('marie-b')]))

    expect(byCode(result, 'duplicate_template_source')[0]?.value).toBe('Marie_2')
  })
})

describe('dvě šablony pro tutéž dvojici', () => {
  it('šablona z Googlu vyhraje nad nahranou, ať přijde kdykoli', () => {
    const google = { filename: 'Marie_2.md', markdown: '# z Googlu\n{BLOK B_Marie_2_X}', fromGoogle: true }
    const upload = { filename: 'Marie_2.md', markdown: '# ze zipu\n{BLOK B_Marie_2_X}' }

    for (const order of [
      [google, upload],
      [upload, google],
    ]) {
      const result = importWorkbook(buildWorkbook(), [...defaultTemplates().filter((t) => t.filename !== 'Marie_2.md'), ...order])
      const warning = byCode(result, 'duplicate_template')[0]

      expect(warning?.message).toContain('ta z Googlu')
    }
  })

  it('vyhraje pozdější a hlásí se varování, ne chyba názvu', () => {
    const result = importWorkbook(buildWorkbook(), [
      ...defaultTemplates(),
      { filename: 'marie_2.md', markdown: '# Marie opravená\n{BLOK B_Marie_2_X}' },
    ])

    expect(byCode(result, 'duplicate_template')[0]).toMatchObject({ severity: 'warning', value: 'Marie_2' })
    expect(byCode(result, 'duplicate_template')[0]?.message).toContain('marie_2.md')
    expect(byCode(result, 'invalid_template_filename')).toEqual([])
  })
})

describe('značka v šabloně patří vlastníkovi a kapitole', () => {
  it('blok jiné postavy je chyba', () => {
    const result = importWorkbook(buildWorkbook(), [
      ...defaultTemplates(),
      { filename: 'Mirek_2.md', markdown: '# Mirek\n{BLOK B_Marie_2_X}' },
    ])

    expect(byCode(result, 'foreign_template_block')[0]).toMatchObject({ value: 'B_Marie_2_X', location: { sheet: 'Mirek_2.md' } })
  })

  it('ID bloku bez slova BLOK poradí správný zápis', () => {
    const result = importWorkbook(buildWorkbook(), [
      ...defaultTemplates().filter((template) => template.filename !== 'Marie_2.md'),
      { filename: 'Marie_2.md', markdown: '**{B\\_Marie\\_2\\_X}**' },
    ])

    expect(byCode(result, 'invalid_template_marker')[0]).toMatchObject({ value: 'B_Marie_2_X', suggestion: 'BLOK B_Marie_2_X' })
  })

  it('vlastní blok projde', () => {
    expect(byCode(importWorkbook(buildWorkbook(), defaultTemplates()), 'foreign_template_block')).toEqual([])
  })
})
