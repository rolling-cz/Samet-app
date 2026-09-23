import { describe, expect, it } from 'vitest'
import type { ParsedTemplate } from '@/import/types/parsed-template'
import { pickNewestTemplates, templateKey, type ArchivedTemplate } from './pick-newest-templates'

const template = (filename: string, ownerRef: string | undefined, chapter: number | undefined, markdown = ''): ParsedTemplate => ({
  ownerRef,
  chapter,
  filename,
  markdown,
  blockIds: [],
  variables: [],
  problems: [],
})

const archived = (
  filename: string,
  ownerRef: string | undefined,
  chapter: number | undefined,
  uploadedAt: string,
  markdown = '',
): ArchivedTemplate => ({
  template: template(filename, ownerRef, chapter, markdown),
  uploadFilename: filename,
  uploadedAt: new Date(uploadedAt),
})

describe('pickNewestTemplates', () => {
  it('novější nahrání téže šablony vyhraje', () => {
    const { byOwner } = pickNewestTemplates([
      archived('Marie_2.md', 'Marie', 2, '2026-01-01T10:00:00Z', 'stará'),
      archived('Marie_2.md', 'Marie', 2, '2026-01-02T10:00:00Z', 'nová'),
    ])

    expect(byOwner.get(templateKey('Marie', 2))?.template.markdown).toBe('nová')
  })

  it('oprava jedné šablony neshodí ostatní z dřívějšího nahrání', () => {
    const { byOwner } = pickNewestTemplates([
      archived('Marie_2.md', 'Marie', 2, '2026-01-01T10:00:00Z', 'původní Marie'),
      archived('Mirek_2.md', 'Mirek', 2, '2026-01-01T10:00:00Z', 'původní Mirek'),
      archived('Marie_2.md', 'Marie', 2, '2026-01-05T10:00:00Z', 'opravená Marie'),
    ])

    expect(byOwner.get(templateKey('Marie', 2))?.template.markdown).toBe('opravená Marie')
    expect(byOwner.get(templateKey('Mirek', 2))?.template.markdown).toBe('původní Mirek')
  })

  it('pořadí na vstupu nerozhoduje, rozhoduje čas nahrání', () => {
    const { byOwner } = pickNewestTemplates([
      archived('Marie_2.md', 'Marie', 2, '2026-01-09T10:00:00Z', 'nová'),
      archived('Marie_2.md', 'Marie', 2, '2026-01-03T10:00:00Z', 'stará'),
    ])

    expect(byOwner.get(templateKey('Marie', 2))?.template.markdown).toBe('nová')
  })

  it('kapitoly téhož vlastníka se nepřebíjejí', () => {
    const { byOwner } = pickNewestTemplates([
      archived('Marie_1.md', 'Marie', 1, '2026-01-01T10:00:00Z', 'kapitola 1'),
      archived('Marie_2.md', 'Marie', 2, '2026-01-01T10:00:00Z', 'kapitola 2'),
    ])

    expect(byOwner.get(templateKey('Marie', 1))?.template.markdown).toBe('kapitola 1')
    expect(byOwner.get(templateKey('Marie', 2))?.template.markdown).toBe('kapitola 2')
  })

  it('klíč nerozlišuje velikost písmen — Docs ji rozhazuje', () => {
    const { byOwner } = pickNewestTemplates([archived('marie_2.md', 'marie', 2, '2026-01-01T10:00:00Z', 'x')])

    expect(byOwner.get(templateKey('Marie', 2))?.template.markdown).toBe('x')
  })

  it('soubor bez rozpoznaného vlastníka nebo kapitoly jde mezi nespárované', () => {
    const { byOwner, unmatched } = pickNewestTemplates([
      archived('poznamky.md', undefined, undefined, '2026-01-01T10:00:00Z'),
      archived('Marie.md', 'Marie', undefined, '2026-01-01T10:00:00Z'),
    ])

    expect(byOwner.size).toBe(0)
    expect(unmatched).toEqual(['poznamky.md', 'Marie.md'])
  })
})

describe('šablona z Googlu má přednost', () => {
  const google = (uploadedAt: string, markdown: string): ArchivedTemplate => ({
    ...archived('Marie_2.md', 'Marie', 2, uploadedAt, markdown),
    template: { ...template('Marie_2.md', 'Marie', 2, markdown), fromGoogle: true },
    uploadFilename: 'sablony-google.zip',
  })

  it('nahraný zip ji nepřebije, ani když je novější', () => {
    const { byOwner } = pickNewestTemplates([
      google('2026-01-01T10:00:00Z', 'z Googlu'),
      archived('Marie_2.md', 'Marie', 2, '2026-01-05T10:00:00Z', 'ze zipu'),
    ])

    expect(byOwner.get(templateKey('Marie', 2))?.template.markdown).toBe('z Googlu')
  })

  it('mezi dvěma z Googlu vyhraje novější', () => {
    const { byOwner } = pickNewestTemplates([
      google('2026-01-01T10:00:00Z', 'starší'),
      google('2026-01-02T10:00:00Z', 'novější'),
      archived('Marie_2.md', 'Marie', 2, '2026-01-03T10:00:00Z', 'ze zipu'),
    ])

    expect(byOwner.get(templateKey('Marie', 2))?.template.markdown).toBe('novější')
  })

  it('bez Googlu zůstává záložní nahraný soubor', () => {
    const { byOwner } = pickNewestTemplates([archived('Mirek_2.md', 'Mirek', 2, '2026-01-05T10:00:00Z', 'ze zipu')])

    expect(byOwner.get(templateKey('Mirek', 2))?.template.markdown).toBe('ze zipu')
  })
})
