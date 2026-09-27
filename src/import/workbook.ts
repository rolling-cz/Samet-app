/**
 * Reading the uploaded file into plain grids (§10.2).
 *
 * The only accepted format is one `.xlsx` with every sheet, downloaded from
 * Google Sheets via *Soubor → Stáhnout → Microsoft Excel*.
 *
 * Cells are read as formatted text (`raw: false`), so a number keeps the shape
 * the author typed and the row number in an error message matches the sheet.
 */
import * as XLSX from 'xlsx'
import { richTextToMarkdown, type FormattedCell } from './rich-text'
import { formattedCellKey, type Grid } from './sheet'
import type { Workbook } from './types/parsed-config'

/** Reads an `.xlsx` buffer into sheet name to grid. */
export const readWorkbook = (data: ArrayBuffer | Uint8Array): Workbook => {
  const workbook = XLSX.read(data, { type: 'array', raw: false })
  const sheets: Workbook = new Map()

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    if (!sheet) continue
    const grid = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      raw: false,
      defval: '',
      blankrows: true,
    })
    const cells: Grid = grid.map((row) => row.map((cell) => (cell ?? '').toString()))
    const formatted = readFormattedCells(sheet)
    if (formatted.size > 0) cells.formatted = formatted
    sheets.set(name, cells)
  }

  return sheets
}

/**
 * Rich-text runs of the sheet, by grid position. `sheet_to_json` starts the
 * grid at the sheet's range, not at A1, so the offset is taken from `!ref`.
 */
const readFormattedCells = (sheet: XLSX.WorkSheet): Map<string, FormattedCell> => {
  const formatted = new Map<string, FormattedCell>()
  const ref = sheet['!ref']
  if (!ref) return formatted
  const origin = XLSX.utils.decode_range(ref).s

  for (const [address, cell] of Object.entries(sheet)) {
    if (address.startsWith('!')) continue
    const { r: richText, v: value } = cell as XLSX.CellObject
    if (typeof richText !== 'string' || value === undefined) continue

    const markdown = richTextToMarkdown(richText, String(value))
    if (!markdown) continue
    const { r, c } = XLSX.utils.decode_cell(address)
    formatted.set(formattedCellKey(r - origin.r, c - origin.c), markdown)
  }

  return formatted
}
