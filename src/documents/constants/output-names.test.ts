import { describe, expect, it } from 'vitest'
import { chapterZipName, documentFileName, outputDownloadName } from './output-names'

describe('documentFileName', () => {
  it('skládá název dokumentu postavy podle §10.4', () => {
    expect(documentFileName({ kind: 'character', id: 'Marie' }, 'Balážová', 'md')).toBe('postava_Marie_Balážová.md')
  })

  it('skládá název dokumentu skupiny', () => {
    expect(documentFileName({ kind: 'group', id: 'Funkcionari' }, 'Funkcionáři', 'md')).toBe(
      'skupina_Funkcionari_Funkcionáři.md',
    )
  })

  it('diakritiku zachová — exporty ji musí unést', () => {
    expect(documentFileName({ kind: 'character', id: 'Vera' }, 'Čapková', 'pdf')).toContain('Čapková')
  })

  it('mezery v názvu nahradí podtržítkem', () => {
    expect(documentFileName({ kind: 'group', id: 'SrdceParty' }, 'Srdce party', 'md')).toBe(
      'skupina_SrdceParty_Srdce_party.md',
    )
  })

  it('znaky, které souborový systém nebere, zahodí', () => {
    expect(documentFileName({ kind: 'character', id: 'Marie' }, 'Ba/lá:žo*vá', 'md')).toBe('postava_Marie_Balážová.md')
  })

  it('prázdné příjmení nenechá na konci podtržítko', () => {
    expect(documentFileName({ kind: 'character', id: 'Organizatori' }, '', 'md')).toBe('postava_Organizatori.md')
  })
})

describe('chapterZipName', () => {
  it('nese běh i kapitolu', () => {
    expect(chapterZipName('2026-09-12_A', 2)).toBe('beh-2026-09-12_A_kapitola-2.zip')
  })
})

describe('outputDownloadName', () => {
  it('samostatně stažený soubor nese běh a kapitolu', () => {
    expect(outputDownloadName('2026-09-12_A', 2, 'postavy.pdf')).toBe('beh-2026-09-12_A_kapitola-2_postavy.pdf')
  })

  it('zip už je obojí nese, nezdvojuje se', () => {
    expect(outputDownloadName('2026-09-12_A', 2, 'beh-2026-09-12_A_kapitola-2.zip')).toBe(
      'beh-2026-09-12_A_kapitola-2.zip',
    )
  })
})
