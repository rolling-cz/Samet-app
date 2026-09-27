import { describe, expect, it } from 'vitest'
import { richTextToMarkdown } from './rich-text'

/** One run the way Google Sheets writes it: font and colour on every run. */
const run = (text: string, extra = ''): string =>
  `<r><rPr><rFont val="Arial"/>${extra}<color theme="1"/></rPr><t xml:space="preserve">${text}</t></r>`
const bold = (text: string) => run(text, '<b/>')
const italic = (text: string) => run(text, '<i/>')

const markdown = (runs: string[]): string | undefined => {
  const plain = runs.join('').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&')

  return richTextToMarkdown(runs.join(''), plain)?.markdown
}

describe('richTextToMarkdown', () => {
  it('turns a bold part of a word into Markdown that still reads as bold', () => {
    // The shape of `2_Content!E22` in a real export from Google Sheets.
    expect(markdown([run('L'), bold('ATE'), run('R')])).toBe('L**ATE**R')
  })

  it('reads bold and italic, nested', () => {
    expect(markdown([run('Na podzim umírá '), bold('Věra'), run(', nejhorší '), italic('chvíle')])).toBe(
      'Na podzim umírá **Věra**, nejhorší *chvíle*',
    )
    expect(markdown([bold('jen tučně '), run('obojí', '<b/><i/>')])).toBe('**jen tučně *obojí***')
  })

  it('moves whitespace outside the delimiters, where Markdown needs it', () => {
    expect(markdown([run('Na podzim '), bold('umírá Věra '), run('.')])).toBe('Na podzim **umírá Věra** .')
    expect(markdown([run('a'), bold(' b')])).toBe('a **b**')
  })

  it('keeps a marker in one piece and reports it when the formatting split it', () => {
    const result = richTextToMarkdown(
      [bold('{JM'), run('ENO} přichází')].join(''),
      '{JMENO} přichází',
    )
    expect(result).toEqual({
      markdown: '**{JMENO}** přichází',
      splitMarkers: ['{JMENO}'],
      droppedFormatting: false,
    })
  })

  it('does not report a marker that is formatted as a whole', () => {
    expect(richTextToMarkdown(bold('{JMENO}'), '{JMENO}')).toMatchObject({ markdown: '**{JMENO}**', splitMarkers: [] })
  })

  it('treats <b val="0"/> as not bold and ignores font, size and colour', () => {
    expect(markdown([run('plain', '<b val="0"/><sz val="10"/>'), run(' text')])).toBeUndefined()
  })

  it('reports underline and strikethrough as dropped, not converted', () => {
    expect(richTextToMarkdown(run('podtrženo', '<u/>'), 'podtrženo')).toEqual({
      markdown: 'podtrženo',
      splitMarkers: [],
      droppedFormatting: true,
    })
  })

  it('decodes XML entities in the runs', () => {
    expect(markdown([bold('A &amp; B')])).toBe('**A & B**')
  })

  it('falls back to plain text when the runs do not add up to the cell', () => {
    expect(richTextToMarkdown(bold('jiný text'), 'text buňky')).toBeUndefined()
  })
})
