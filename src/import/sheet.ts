/**
 * Turning a workbook sheet into rows the rest of the import can trust.
 *
 * The export from Google Sheets is messy in predictable ways: trailing spaces,
 * empty rows, and merged cells that leave `Character` and `Block ID` filled in
 * only on the first row of a group (§8.2). All of that is handled quietly here,
 * but every repair is counted so the import report can say what was cleaned up.
 */
import { MAX_HEADER_ROW_INDEX } from './constants/spreadsheet'
import type { IssueLocation } from './types/issue'
import { columnLetter } from './utils/column-letter'

/** A row with its original position, so every message can point at the sheet. */
export interface SheetRow {
  /** 1-based row number as the author sees it; the header is row 1. */
  rowNumber: number
  /** Values by column header. */
  values: Record<string, string>
  /** Locates a cell in this row for an issue message. */
  at(column: string): IssueLocation
  /** Trimmed value, or `''` when the column is absent or empty. */
  get(column: string): string
  /**
   * The cell as it stood before fill-down.
   *
   * Needed to tell where a merged group starts: once `Character` and `Text` are
   * carried down, every row of a question looks like its first one, and a
   * question whose ID the author left empty (§4.2) could not be split from the
   * next.
   */
  raw(column: string): string
  /**
   * A blank row stood directly above this one.
   *
   * A blank row ends a merged group (§10.2), so the parser needs to know: an
   * answer row after one belongs to no question, which is exactly the mistake
   * §11.1 is about.
   */
  precededByBlank: boolean
}

export interface SheetReadResult {
  rows: SheetRow[]
  /** Headers as found, in order. */
  headers: string[]
  /** 1-based row the header was found on; the body starts below it. */
  headerRowNumber: number
  /** Counts of the quiet repairs, for the import summary. */
  repairs: {
    trimmedCells: number
    filledDownCells: number
    skippedEmptyRows: number
  }
}

/** Raw grid: array of rows, each an array of cell strings. */
export type Grid = string[][]

/**
 * Normalises one cell: trims, collapses inner runs of whitespace, and turns the
 * non-breaking space Google Sheets likes to emit into an ordinary one.
 *
 * Diacritics are left untouched — they are legitimate content in IDs and names.
 */
export const normalizeCell = (value: unknown): string => {
  if (value === null || value === undefined) return ''

  return String(value).replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

export interface ReadSheetOptions {
  /** Columns whose value carries down from the first row of a merged group. */
  fillDown?: readonly string[]
  /**
   * Column names that identify the header row.
   *
   * The export from Google Sheets puts a banner above the real header on most
   * sheets, and a column whose name lives only in that banner (`Scale and
   * Resources Impact`) still has to be readable — so the two rows are merged,
   * with the lower one winning.
   */
  required?: readonly string[]
}

/**
 * Reads a grid into rows keyed by header.
 *
 * Duplicate headers keep the first occurrence: a second column with the same
 * name is almost always a leftover, and silently overwriting would hide it.
 */
export const readSheet = (
  sheetName: string,
  grid: Grid,
  options: ReadSheetOptions = {},
): SheetReadResult => {
  const repairs = { trimmedCells: 0, filledDownCells: 0, skippedEmptyRows: 0 }

  const headerRowIndex = findHeaderRow(grid, options.required ?? [])
  const headerRow = mergeHeaderRows(grid, headerRowIndex)

  const headers: string[] = []
  const headerIndex = new Map<string, number>()
  headerRow.forEach((header, index) => {
    if (header === '') return
    if (!headerIndex.has(header)) {
      headerIndex.set(header, index)
      headers.push(header)
    }
  })

  // A sheet exported from Google Sheets carries thousands of empty rows below
  // the data. Counting those as skipped would drown the one number the author
  // cares about: the blank rows they left inside the data.
  const bodyRows = dropTrailingBlankRows(grid.slice(headerRowIndex + 1), headerIndex)

  const fillDown = options.fillDown ?? []
  const carried = new Map<string, string>()
  const rows: SheetRow[] = []
  let afterBlank = false

  bodyRows.forEach((rawRow, bodyIndex) => {
    const rowNumber = headerRowIndex + bodyIndex + 2
    const values: Record<string, string> = {}
    let anyValue = false

    for (const [header, columnIndex] of headerIndex) {
      const raw = rawRow[columnIndex]
      const clean = normalizeCell(raw)
      if (raw !== undefined && raw !== null && String(raw) !== clean) repairs.trimmedCells++
      values[header] = clean
      if (clean !== '') anyValue = true
    }

    if (!anyValue) {
      repairs.skippedEmptyRows++
      // A blank row ends a merged group; carrying values across it would attach
      // variants to the wrong block.
      carried.clear()
      afterBlank = true

      return
    }

    const rawValues = { ...values }

    for (const header of fillDown) {
      if (!headerIndex.has(header)) continue
      if (values[header] !== '') {
        carried.set(header, values[header] ?? '')
      } else if (carried.has(header)) {
        values[header] = carried.get(header) ?? ''
        repairs.filledDownCells++
      }
    }

    rows.push(makeRow(sheetName, rowNumber, values, rawValues, headerIndex, afterBlank))
    afterBlank = false
  })

  return { rows, headers, headerRowNumber: headerRowIndex + 1, repairs }
}

/**
 * The header is the topmost row naming at least one required column. Without
 * a hint (no required columns given) it is the first row, as it used to be.
 */
/** Everything below the last row with a value in a known column is export padding. */
const dropTrailingBlankRows = (bodyRows: Grid, headerIndex: Map<string, number>): Grid => {
  for (let index = bodyRows.length - 1; index >= 0; index--) {
    const row = bodyRows[index] ?? []
    for (const columnIndex of headerIndex.values()) {
      if (normalizeCell(row[columnIndex]) !== '') return bodyRows.slice(0, index + 1)
    }
  }

  return []
}

const findHeaderRow = (grid: Grid, required: readonly string[]): number => {
  if (required.length === 0) return 0

  const wanted = new Set(required)
  const limit = Math.min(MAX_HEADER_ROW_INDEX, Math.max(grid.length - 1, 0))

  for (let index = 0; index <= limit; index++) {
    const row = grid[index] ?? []
    if (row.some((cell) => wanted.has(normalizeCell(cell)))) return index
  }

  return 0
}

/**
 * Names from the banner row fill the gaps the header row leaves, so a column
 * labelled only above (`Scale and Resources Impact`) is still addressable.
 */
const mergeHeaderRows = (grid: Grid, headerRowIndex: number): string[] => {
  const primary = grid[headerRowIndex] ?? []
  const banner = headerRowIndex > 0 ? (grid[headerRowIndex - 1] ?? []) : []
  const width = Math.max(primary.length, banner.length)

  const merged: string[] = []
  for (let index = 0; index < width; index++) {
    const own = normalizeCell(primary[index])
    merged.push(own === '' ? normalizeCell(banner[index]) : own)
  }

  return merged
}

const makeRow = (
  sheet: string,
  rowNumber: number,
  values: Record<string, string>,
  rawValues: Record<string, string>,
  headerIndex: Map<string, number>,
  precededByBlank: boolean,
): SheetRow => {
  return {
    rowNumber,
    values,
    precededByBlank,
    get: (column) => values[column] ?? '',
    raw: (column) => rawValues[column] ?? '',
    at: (column) => {
      const index = headerIndex.get(column)

      return {
        sheet,
        row: rowNumber,
        column,
        cell: index === undefined ? undefined : `${columnLetter(index)}${rowNumber}`,
      }
    },
  }
}

/** Headers present in the sheet but not in the expected list — usually a rename. */
export const missingColumns = (headers: string[], required: readonly string[]): string[] => {
  const present = new Set(headers)

  return required.filter((column) => !present.has(column))
}
