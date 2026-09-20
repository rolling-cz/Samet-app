import { GROUP_COLUMNS, GROUPS_SHEET } from '../constants/sheets'
import type { IssueCollector } from '../issue-collector'
import type { ParsedGroup } from '../types/parsed-group'
import type { ImportRepairs, Workbook } from '../types/parsed-config'
import { readConfigSheet, requireColumns } from './read-config-sheet'

/**
 * The `Groups` sheet (§4.2): ID and name.
 *
 * Members and leadership are not read because they are not state (§4.6) —
 * block variants and their conditions say who belongs where. The registry
 * exists so blocks can be owned by a group and so the import can check that
 * each group has a template (§10.2).
 */
export const parseGroups = (
  workbook: Workbook,
  issues: IssueCollector,
  repairs: ImportRepairs,
): ParsedGroup[] => {
  const read = readConfigSheet(workbook, GROUPS_SHEET, repairs, GROUP_COLUMNS)
  if (!read) return []
  if (!requireColumns(GROUPS_SHEET, read.headers, GROUP_COLUMNS, issues)) return []

  const groups: ParsedGroup[] = []
  const seen = new Map<string, number>()

  for (const row of read.rows) {
    const externalId = row.get('ID')
    if (externalId === '') {
      issues.error(
        'chybejici_hodnota',
        row.at('ID'),
        'Řádek nemá `ID` — skupina bez ID se nedá na nic navázat.',
      )
      continue
    }

    const previous = seen.get(externalId)
    if (previous !== undefined) {
      issues.error(
        'duplicitni_id',
        row.at('ID'),
        `Skupina \`${externalId}\` je v listu dvakrát (poprvé na řádku ${previous}).`,
        { value: externalId },
      )
      continue
    }
    seen.set(externalId, row.rowNumber)

    groups.push({
      externalId,
      name: row.get('Name') || externalId,
      location: row.at('ID'),
    })
  }

  return groups
}
