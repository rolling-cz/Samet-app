import { DEFAULT_SCALE_MAX, DEFAULT_SCALE_MIN } from '../constants/scale-defaults'
import { SCALE_COLUMNS, SCALE_FILL_DOWN_COLUMNS, SCALES_SHEET } from '../constants/sheets'
import type { CharacterAliases } from '../characters'
import { splitImpactId } from '../scale-impact'
import type { IssueCollector } from '../issue-collector'
import type { ImportRepairs, Workbook } from '../types/parsed-config'
import type { ParsedScaleRow } from '../types/parsed-scale'
import { readConfigSheet, requireColumns } from './read-config-sheet'
import { readInteger } from './read-number'
import { resolveOwner } from './resolve-character-refs'

/**
 * The `Scales` sheet (§4.2): which scales a character has, on what range and
 * from what starting value.
 *
 * Chapter-independent on purpose — `Default` is the state before chapter 1, and
 * from chapter 2 the engine starts from the previous chapter's snapshot, so a
 * per-chapter sheet would only invite two sources of truth.
 */
export const parseScales = (
  workbook: Workbook,
  aliases: CharacterAliases,
  issues: IssueCollector,
  repairs: ImportRepairs,
): ParsedScaleRow[] => {
  const read = readConfigSheet(workbook, SCALES_SHEET, repairs, SCALE_COLUMNS, SCALE_FILL_DOWN_COLUMNS)
  if (!read) {
    issues.error(
      'chybejici_list',
      { sheet: SCALES_SHEET },
      `V souboru chybí povinný list \`${SCALES_SHEET}\` se škálami postav.`,
    )

    return []
  }
  if (!requireColumns(SCALES_SHEET, read.headers, SCALE_COLUMNS, issues)) return []

  const rows: ParsedScaleRow[] = []
  const seen = new Map<string, number>()

  for (const row of read.rows) {
    const characterRef = row.get('Character')
    const externalId = row.get('ID')
    if (externalId === '') {
      issues.error('chybejici_hodnota', row.at('ID'), 'Řádek nemá `ID` škály.')
      continue
    }

    // The ID carries both parts (`S_Marie_Regime`); the `Character` column
    // repeats the owner and is what the author is most likely to mistype.
    const parts = splitImpactId(externalId)
    if (!parts || parts.kind !== 'skala') {
      issues.error(
        'chybejici_hodnota',
        row.at('ID'),
        `\`${externalId}\` není ID škály — čeká se tvar \`S_<Postava>_<Skala>\`.`,
        { value: externalId },
      )
      continue
    }
    const key = parts.key

    if (characterRef === '') {
      issues.error(
        'chybejici_hodnota',
        row.at('Character'),
        `Škála \`${externalId}\` nemá postavu — každý řádek je dvojice postava × škála.`,
      )
      continue
    }

    const characterId = resolveOwner(
      characterRef,
      aliases,
      repairs,
      row.at('Character'),
      `Škála \`${externalId}\``,
      issues,
    )

    const previous = seen.get(externalId)
    if (previous !== undefined) {
      issues.error(
        'duplicitni_id',
        row.at('ID'),
        `Dvojice postava × škála \`${externalId}\` je v listu \`${SCALES_SHEET}\` dvakrát (poprvé na řádku ${previous}).`,
        { value: externalId },
      )
      continue
    }
    seen.set(externalId, row.rowNumber)

    const min = readInteger(row, 'Min', DEFAULT_SCALE_MIN, externalId, issues)
    const max = readInteger(row, 'Max', DEFAULT_SCALE_MAX, externalId, issues)

    rows.push({
      externalId,
      characterRef,
      characterId,
      key,
      label: row.get('Name') || key,
      min,
      max,
      defaultValue: readInteger(row, 'Default', min, externalId, issues),
      location: row.at('ID'),
    })
  }

  return rows
}
