import { describe, expect, it } from 'vitest'
import type { GeneratedDocument } from '../types/document'
import { resolveOutputFile, type OutputFileSource } from './resolve-output-file'

const doc = (kind: 'character' | 'group', id: string, name: string, problems = 0): GeneratedDocument => ({
  owner: { kind, id },
  ownerLabel: name,
  chapter: 2,
  fileName: `${kind === 'character' ? 'postava' : 'skupina'}_${id}_${name}.md`,
  markdown: `# ${name}`,
  problems: Array.from({ length: problems }, () => ({ code: 'unknown_block', raw: '{BLOK B_X}', detail: '' })),
  template: { uploadFilename: 'sablony.zip', uploadedAt: new Date(0), fromGoogle: false },
})

const marie = doc('character', 'Marie', 'Balážová')
const mirek = doc('character', 'Mirek', 'Pokorný')
const funkcionari = doc('group', 'Funkcionari', 'Funkcionáři')

const source = (overrides: Partial<OutputFileSource> = {}): OutputFileSource => ({
  runId: '2026-09-12_A',
  chapter: 2,
  documents: [marie, mirek, funkcionari],
  missingOwners: [],
  ...overrides,
})

describe('resolveOutputFile', () => {
  it('najde .md podle názvu z §10.4, i s diakritikou', () => {
    expect(resolveOutputFile('postava_Marie_Balážová.md', source())).toEqual({ _type: 'markdown', document: marie })
  })

  it('.pdf jednoho dokumentu', () => {
    expect(resolveOutputFile('postava_Mirek_Pokorný.pdf', source())).toEqual({ _type: 'pdf', documents: [mirek] })
  })

  it('sloučené PDF jen s dokumenty svého typu', () => {
    expect(resolveOutputFile('postavy.pdf', source())).toEqual({ _type: 'pdf', documents: [marie, mirek] })
    expect(resolveOutputFile('skupiny.pdf', source())).toEqual({ _type: 'pdf', documents: [funkcionari] })
  })

  it('zip podle názvu s během a kapitolou', () => {
    expect(resolveOutputFile('beh-2026-09-12_A_kapitola-2.zip', source())).toEqual({ _type: 'zip' })
  })

  it('zip jiného běhu nebo kapitoly nezná', () => {
    expect(resolveOutputFile('beh-2026-09-12_B_kapitola-2.zip', source())._type).toBe('not_found')
    expect(resolveOutputFile('beh-2026-09-12_A_kapitola-3.zip', source())._type).toBe('not_found')
  })

  it('.md s problémem jde stáhnout — org ho čte a opravuje', () => {
    const broken = doc('character', 'Marie', 'Balážová', 1)

    expect(resolveOutputFile(broken.fileName, source({ documents: [broken] }))._type).toBe('markdown')
  })

  it('.pdf ani zip s problémem nevznikne (§8.1)', () => {
    const broken = doc('character', 'Marie', 'Balážová', 1)
    const withBroken = source({ documents: [broken, mirek, funkcionari] })

    expect(resolveOutputFile('postava_Marie_Balážová.pdf', withBroken)).toEqual({
      _type: 'not_printable',
      reason: 'fill_problems',
    })
    expect(resolveOutputFile('postavy.pdf', withBroken)).toMatchObject({ reason: 'fill_problems' })
    expect(resolveOutputFile('beh-2026-09-12_A_kapitola-2.zip', withBroken)).toMatchObject({ reason: 'fill_problems' })
    // The other type is unaffected.
    expect(resolveOutputFile('skupiny.pdf', withBroken)._type).toBe('pdf')
  })

  it('chybějící šablona zastaví sloučené PDF svého typu i zip, ne jednotlivé PDF', () => {
    const missing = source({ missingOwners: [{ kind: 'character', id: 'Antonin' }] })

    expect(resolveOutputFile('postavy.pdf', missing)).toMatchObject({ reason: 'missing_templates' })
    expect(resolveOutputFile('beh-2026-09-12_A_kapitola-2.zip', missing)).toMatchObject({ reason: 'missing_templates' })
    expect(resolveOutputFile('skupiny.pdf', missing)._type).toBe('pdf')
    expect(resolveOutputFile('postava_Marie_Balážová.pdf', missing)._type).toBe('pdf')
  })

  it('sloučené PDF bez jediného dokumentu', () => {
    expect(resolveOutputFile('skupiny.pdf', source({ documents: [marie] }))).toMatchObject({ reason: 'no_documents' })
  })

  it('neznámý název', () => {
    expect(resolveOutputFile('postava_Karel.md', source())._type).toBe('not_found')
    expect(resolveOutputFile('../etc/passwd', source())._type).toBe('not_found')
  })
})
