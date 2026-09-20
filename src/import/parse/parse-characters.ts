import { CHARACTER_COLUMNS, CHARACTERS_SHEET } from '../constants/sheets'
import type { IssueCollector } from '../issue-collector'
import type { ParsedCharacter } from '../types/parsed-character'
import type { ImportRepairs, Workbook } from '../types/parsed-config'
import { readConfigSheet, requireColumns } from './read-config-sheet'

/**
 * The `Characters` sheet (§4.2) — the registry, and nothing else.
 *
 * Starting values used to live here as `S_<Skala>` columns; they moved to the
 * `Scales` and `Resources` sheets, where `Min` and `Max` can differ per
 * character (§4.2). A leftover `S_` column is therefore worth a warning: it
 * looks like config but nothing reads it.
 */
export const parseCharacters = (
  workbook: Workbook,
  issues: IssueCollector,
  repairs: ImportRepairs,
): ParsedCharacter[] => {
  const read = readConfigSheet(workbook, CHARACTERS_SHEET, repairs, CHARACTER_COLUMNS)
  if (!read) {
    issues.error(
      'missing_sheet',
      { sheet: CHARACTERS_SHEET },
      `V souboru chybí povinný list \`${CHARACTERS_SHEET}\` s registrem postav.`,
    )

    return []
  }
  if (!requireColumns(CHARACTERS_SHEET, read.headers, CHARACTER_COLUMNS, issues)) return []

  for (const header of read.headers) {
    if (!/^[SR]_/.test(header)) continue
    issues.warn(
      'missing_column',
      { sheet: CHARACTERS_SHEET, column: header },
      `Sloupec \`${header}\` v listu \`${CHARACTERS_SHEET}\` se nečte — počáteční hodnoty patří do listů \`Scales\` a \`Resources\`.`,
      { value: header },
    )
  }

  const characters: ParsedCharacter[] = []
  const seen = new Map<string, number>()

  for (const row of read.rows) {
    const externalId = row.get('ID')
    if (externalId === '') {
      issues.error(
        'missing_value',
        row.at('ID'),
        'Řádek nemá `ID` — postava bez ID se nedá na nic navázat.',
      )
      continue
    }

    const previous = seen.get(externalId)
    if (previous !== undefined) {
      issues.error(
        'duplicate_id',
        row.at('ID'),
        `Postava \`${externalId}\` je v listu dvakrát (poprvé na řádku ${previous}).`,
        { value: externalId },
      )
      continue
    }
    seen.set(externalId, row.rowNumber)

    characters.push({
      externalId,
      firstName: row.get('Name'),
      lastName: row.get('Surname'),
      householdRef: row.get('Household') || undefined,
      householdLocation: row.at('Household'),
      location: row.at('ID'),
    })
  }

  return characters
}
