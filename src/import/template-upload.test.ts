import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { importWorkbook } from './import-config'
import { buildWorkbook } from './testing/build-workbook'
import { parseTemplateFilename } from './template'
import { readTemplateFiles, templateCoverage } from './template-upload'

const MARIE = '# Marie Balážová\n\n{BLOK B_Marie_2_X}\n'

const config = () => importWorkbook(buildWorkbook()).config

const asFile = (filename: string, text: string) => ({
  filename,
  data: new TextEncoder().encode(text),
})

describe('parseTemplateFilename', () => {
  it('reads the owner and the chapter', () => {
    expect(parseTemplateFilename('Marie_2.md')).toEqual({ ownerRef: 'Marie', chapter: 2 })
    expect(parseTemplateFilename('Funkcionari_2.md')).toEqual({
      ownerRef: 'Funkcionari',
      chapter: 2,
    })
  })

  it('takes the trailing number, so an ID may end in digits', () => {
    expect(parseTemplateFilename('Skupina2_3.md')).toEqual({ ownerRef: 'Skupina2', chapter: 3 })
  })

  it('ignores the folder a zip puts it in', () => {
    expect(parseTemplateFilename('sablony/Marie_1.md')).toEqual({ ownerRef: 'Marie', chapter: 1 })
  })

  it('returns nothing for a name that carries no chapter', () => {
    expect(parseTemplateFilename('marie.md')).toBeUndefined()
  })
})

describe('readTemplateFiles', () => {
  it('reads several .md files at once, keeping diacritics', async () => {
    const templates = await readTemplateFiles([
      asFile('Marie_2.md', MARIE),
      asFile('Mirek_2.md', '# Mirek'),
    ])
    expect(templates.map((t) => t.ownerRef)).toEqual(['Marie', 'Mirek'])
    expect(templates[0]?.markdown).toContain('Balážová')
  })

  it('ignores files that are not Markdown', async () => {
    const templates = await readTemplateFiles([asFile('poznamky.txt', 'nic')])
    expect(templates).toEqual([])
  })

  it('unpacks a zip of templates', async () => {
    const zip = new JSZip()
    zip.file('Marie_2.md', MARIE)
    zip.file('sablony/Karel_2.md', '# Karel')
    const data = await zip.generateAsync({ type: 'uint8array' })

    const templates = await readTemplateFiles([{ filename: 'sablony.zip', data }])
    expect(templates.map((t) => t.ownerRef).sort()).toEqual(['Karel', 'Marie'])
  })

  it('skips the shadow tree a macOS zip carries', async () => {
    const zip = new JSZip()
    zip.file('Marie_2.md', MARIE)
    zip.file('__MACOSX/._Marie_2.md', 'smeti')
    const data = await zip.generateAsync({ type: 'uint8array' })

    const templates = await readTemplateFiles([{ filename: 'sablony.zip', data }])
    expect(templates).toHaveLength(1)
  })

  it('reports a closing {/BLOK}, which the format no longer has (§8.4)', async () => {
    const templates = await readTemplateFiles([asFile('Marie_2.md', '{BLOK B_1}\n{/BLOK}')])
    expect(templates[0]?.problems).toHaveLength(1)
  })
})

describe('templateCoverage', () => {
  it('expects one template per owner and chapter, and says which is missing', async () => {
    const templates = await readTemplateFiles([asFile('Marie_2.md', MARIE)])
    const coverage = templateCoverage(config(), templates)

    const marie = coverage.assignments.find((a) => a.ownerExternalId === 'Marie')
    expect(marie).toMatchObject({ status: 'assigned', filename: 'Marie_2.md', chapter: 2 })
    // Mirek and the group are still missing theirs.
    expect(coverage.missingCount).toBe(2)
  })

  it('covers groups as well as characters', async () => {
    const coverage = templateCoverage(config(), [])
    expect(coverage.assignments.map((a) => a.ownerExternalId)).toEqual([
      'Marie',
      'Mirek',
      'SrdceParty',
    ])
    expect(coverage.assignments.at(-1)?.ownerKind).toBe('group')
  })

  it('lists uploaded files whose name belongs to nobody', async () => {
    const templates = await readTemplateFiles([asFile('Nikdo_2.md', '# Nikdo')])
    const coverage = templateCoverage(config(), templates)
    expect(coverage.unmatched.map((t) => t.filename)).toEqual(['Nikdo_2.md'])
  })

  it('a file for a chapter the workbook does not carry belongs to nobody', async () => {
    const templates = await readTemplateFiles([asFile('Marie_3.md', MARIE)])
    const coverage = templateCoverage(config(), templates)
    expect(coverage.unmatched.map((t) => t.filename)).toEqual(['Marie_3.md'])
  })

  it('uses the full character name in the overview', async () => {
    const coverage = templateCoverage(config(), [])
    expect(coverage.assignments[0]?.ownerName).toBe('Marie Balážová')
  })
})
