/**
 * Reading a real `.xlsx` with rich text. SheetJS cannot write rich-text runs,
 * so the file is written plainly and its shared strings are patched to the
 * shape Google Sheets exports.
 */
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { importWorkbook } from './import-config'
import { formattedCellKey } from './sheet'
import { buildWorkbook } from './testing/build-workbook'
import { readWorkbook } from './workbook'

const BOLD_RUNS =
  '<r><rPr><rFont val="Arial"/><color theme="1"/></rPr><t>Na podzim umírá </t></r>' +
  '<r><rPr><rFont val="Arial"/><b/><color theme="1"/></rPr><t>Věra</t></r>'

/** The default test workbook as a file, with one cell's text replaced by rich runs. */
const xlsxWithRichCell = async (sheet: string, plain: string): Promise<Uint8Array> => {
  const book = XLSX.utils.book_new()
  for (const [name, grid] of buildWorkbook()) XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(grid), name)
  const cells = XLSX.utils.sheet_to_json<string[]>(book.Sheets[sheet] as XLSX.WorkSheet, { header: 1 })
  const target = cells.flat().find((cell) => cell === plain)
  if (target === undefined) throw new Error(`${sheet} has no cell "${plain}"`)

  const zip = await JSZip.loadAsync(XLSX.write(book, { type: 'array', bookType: 'xlsx', bookSST: true }))
  const shared = await zip.file('xl/sharedStrings.xml')?.async('string')
  if (shared === undefined) throw new Error('no shared strings')
  zip.file('xl/sharedStrings.xml', shared.replace(`<si><t>${plain}</t></si>`, `<si>${BOLD_RUNS}</si>`))

  return zip.generateAsync({ type: 'uint8array' })
}

const withText = async (sheet: string, plain: string) => {
  const workbook = readWorkbook(await xlsxWithRichCell(sheet, plain))
  return importWorkbook(workbook)
}

describe('bold and italic from the sheet (§8.2)', () => {
  it('reaches Variation Text as Markdown', async () => {
    const result = await withText('2_Content', 'Text A')
    const variation = (result.config.blocks.get(2) ?? []).find((block) => block.externalId === 'B_Marie_2_X')?.variations[0]
    expect(variation?.text).toBe('Na podzim umírá **Věra**')
    expect(result.config.repairs.formattedCells).toBe(1)
  })

  it('reaches the question text as Markdown', async () => {
    const result = await withText('2_Questions', 'Otázka?')
    expect(result.config.questions.get(2)?.[0]?.text).toBe('Na podzim umírá **Věra**')
  })

  it('never changes an ID, however it is formatted', async () => {
    const result = await withText('2_Content', 'V_A')
    const ids = (result.config.blocks.get(2) ?? []).flatMap((block) => block.variations.map((variation) => variation.externalId))
    expect(ids).toContain('Na podzim umírá Věra')
    expect(ids.some((id) => id.includes('*'))).toBe(false)
  })

  it('stops the import when bold starts inside a marker', () => {
    const workbook = buildWorkbook()
    const content = workbook.get('2_Content')
    if (!content) throw new Error('no 2_Content')
    // Row 1, column 4 is the first variant's Variation Text.
    content.formatted = new Map([
      [formattedCellKey(1, 4), { markdown: '**{JMENO}** přichází', splitMarkers: ['{JMENO}'], droppedFormatting: false }],
    ])
    const issue = importWorkbook(workbook).errors.find((error) => error.code === 'formatting_in_marker')
    expect(issue).toMatchObject({ value: '{JMENO}', location: { sheet: '2_Content', column: 'Variation Text', row: 2 } })
  })
})
