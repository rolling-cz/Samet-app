/** Reading one sheet of the config and checking its header. */
import type { IssueCollector } from '../issue-collector'
import { missingColumns, readSheet, type SheetReadResult } from '../sheet'
import type { ImportRepairs, Workbook } from '../types/parsed-config'

/** Reads a sheet, folding its repair counts into the running total. */
export const readConfigSheet = (
  workbook: Workbook,
  name: string,
  repairs: ImportRepairs,
  required: readonly string[],
  fillDown: readonly string[] = [],
): SheetReadResult | undefined => {
  const grid = workbook.get(name)
  if (!grid) return undefined

  const result = readSheet(name, grid, { required, fillDown })
  repairs.trimmedCells += result.repairs.trimmedCells
  repairs.filledDownCells += result.repairs.filledDownCells
  repairs.skippedEmptyRows += result.repairs.skippedEmptyRows

  return result
}

/** Reports every missing required column; true when none is missing. */
export const requireColumns = (
  sheetName: string,
  headers: string[],
  required: readonly string[],
  issues: IssueCollector,
): boolean => {
  const missing = missingColumns(headers, required)
  for (const column of missing) {
    issues.error(
      'missing_column',
      { sheet: sheetName },
      `Listu \`${sheetName}\` chybí povinný sloupec \`${column}\`.`,
      { value: column },
    )
  }

  return missing.length === 0
}
