/**
 * The one thing a PDF test must catch: a **silent fallback to Helvetica**.
 *
 * If the fonts are not registered and loaded in time, react-pdf draws with a
 * standard face that has no Czech diacritics, and the failure only shows on
 * paper. Asserting that the embedded font names are in the file turns that into
 * a red test.
 *
 * Runs here rather than in `scripts/documents-demo.ts` because react-pdf and
 * `marked` ship as ESM only and the scripts go through tsx in a CommonJS
 * project; vitest loads ESM natively, as Next's bundler does in the app.
 */
import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import type { GeneratedDocument } from '../types/document'
import { DOCUMENT_THEME } from './document-theme'
import { documentLogo } from './logo'
import { renderDocumentsPdf } from './render-pdf'

const document = (id: string, markdown: string): GeneratedDocument => ({
  owner: { kind: 'character', id },
  ownerLabel: id,
  chapter: 2,
  fileName: `postava_${id}.md`,
  markdown,
  problems: [],
  template: { uploadFilename: 'sablony.zip', uploadedAt: new Date(0), fromGoogle: false },
})

const SAMPLE = `# Antonín Hájek

Ročník 1928 (64 let)

## Životopis

Příliš žluťoučký kůň úpěl ďábelské ódy. **DOPAD:** ekonomický status.

1. Laco a Oľga Novákovi
2. Zdenko Novák

---

*Kurzívou* a ***obojím***.
`

/** A PDF stores names as `/BaseFont /ABCDEF+Urbanist`; the subset prefix varies. */
const mentionsFont = (pdf: string, family: string): boolean => new RegExp(`[+/]${family}`).test(pdf)

describe('renderDocumentsPdf', () => {
  it('vyrobí platné PDF', async () => {
    const buffer = await renderDocumentsPdf([document('Antonin', SAMPLE)])

    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(buffer.length).toBeGreaterThan(10_000)
  })

  it('vloží oba naše fonty, ne náhradní Helveticu', async () => {
    const buffer = await renderDocumentsPdf([document('Antonin', SAMPLE)])
    const raw = buffer.toString('latin1')

    expect(mentionsFont(raw, DOCUMENT_THEME.font.body)).toBe(true)
    expect(mentionsFont(raw, DOCUMENT_THEME.font.display)).toBe(true)
    expect(/[+/]Helvetica/.test(raw)).toBe(false)
  })

  it('sloučí dokumenty podle typu do jednoho souboru, stránku na dokument', async () => {
    const one = await renderDocumentsPdf([document('Antonin', SAMPLE)])
    const three = await renderDocumentsPdf([
      document('Antonin', SAMPLE),
      document('Marie', SAMPLE),
      document('Mirek', SAMPLE),
    ])

    expect(pageCount(three)).toBe(3 * pageCount(one))
  })

  it('prázdný dokument projde — varianta „nic se nestalo" nechá jen pevný text', async () => {
    const buffer = await renderDocumentsPdf([document('Marie', '# Marie\n\n## Co se stalo\n')])

    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-')
  })

  it('bez dokumentů se PDF nedělá', async () => {
    await expect(renderDocumentsPdf([])).rejects.toThrow()
  })

  /**
   * Reaches into the content stream on purpose. The emblem once shipped as
   * several kilobytes of perfectly good path data drawn at eight times its size
   * and clipped away — present in the file, invisible on paper. Only the scale
   * transform tells the two apart, so that is what is asserted.
   */
  it('vykreslí logo zmenšené podle viewBoxu, ne v souřadnicích předlohy', async () => {
    const buffer = await renderDocumentsPdf([document('Antonin', SAMPLE)])
    const stream = firstContentStream(buffer)

    const viewBoxWidth = Number(documentLogo().viewBox.split(/\s+/)[2])
    const scale = (DOCUMENT_THEME.logo.size / viewBoxWidth).toFixed(6)

    expect(stream).toContain(`${scale} 0 0 ${scale}`)
    // The gold of the circle; without it nothing of the emblem was drawn at all.
    expect(stream).toContain('0.8745098039215686 0.6313725490196078 0.24313725490196078')
  })
})

const firstContentStream = (pdf: Buffer): string => {
  const raw = pdf.toString('latin1')
  const start = raw.indexOf('stream\n') + 'stream\n'.length
  const end = raw.indexOf('endstream', start)

  return inflateSync(pdf.subarray(start, end)).toString('latin1')
}

const pageCount = (pdf: Buffer): number => (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length
