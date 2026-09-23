import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { runFixture } from '@/testing/fixture-run'
import { outputOverview } from '../convert/output-overview'
import type { GeneratedDocument } from '../types/document'
import { buildChapterZip } from './build-chapter-zip'

const fixture = runFixture()

const doc = (kind: 'character' | 'group', id: string, fileName: string): GeneratedDocument => ({
  owner: { kind, id },
  ownerLabel: id,
  chapter: 2,
  fileName,
  markdown: `# ${id}\n\nŽluťoučký kůň úpěl ďábelské ódy.`,
  problems: [],
  template: { uploadFilename: 'sablony.zip', uploadedAt: new Date(0), fromGoogle: false },
})

const build = (documents: GeneratedDocument[]) =>
  buildChapterZip({
    runId: '2026-09-12_A',
    chapter: 2,
    generatedAt: new Date('2026-09-23T10:00:00Z'),
    overview: outputOverview(fixture.config, fixture.chapter1.state, 2),
    documents,
  }).then((buffer) => JSZip.loadAsync(buffer))

describe('buildChapterZip', () => {
  it('rozložení podle §10.4', async () => {
    const zip = await build([
      doc('character', 'Marie', 'postava_Marie_Balážová.md'),
      doc('group', 'Funkcionari', 'skupina_Funkcionari_Funkcionáři.md'),
    ])

    const files = Object.values(zip.files)
      .filter((entry) => !entry.dir)
      .map((entry) => entry.name)
      .sort()

    expect(files).toEqual([
      'beh.json',
      'dokumenty/postava_Marie_Balážová.md',
      'dokumenty/postavy.pdf',
      'dokumenty/skupina_Funkcionari_Funkcionáři.md',
      'dokumenty/skupiny.pdf',
      'vysledky.xlsx',
    ])
  })

  it('.md v zipu je přesně naplněný text, diakritika nepoškozená', async () => {
    const marie = doc('character', 'Marie', 'postava_Marie_Balážová.md')
    const zip = await build([marie])

    expect(await zip.file('dokumenty/postava_Marie_Balážová.md')?.async('string')).toBe(marie.markdown)
  })

  it('bez skupin nevznikne prázdné skupiny.pdf', async () => {
    const zip = await build([doc('character', 'Marie', 'postava_Marie_Balážová.md')])

    expect(zip.file('dokumenty/skupiny.pdf')).toBeNull()
  })

  it('beh.json nese běh, kapitolu a přehled', async () => {
    const zip = await build([doc('character', 'Marie', 'postava_Marie_Balážová.md')])
    const archive = JSON.parse((await zip.file('beh.json')?.async('string')) ?? '{}')

    expect(archive).toMatchObject({ format: 1, runId: '2026-09-12_A', chapter: 2, computation: null })
    expect(archive.overview.characters.length).toBe(fixture.config.characters.length)
  })
})
