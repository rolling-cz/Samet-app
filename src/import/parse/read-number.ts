import type { IssueCollector } from '../issue-collector'
import type { SheetRow } from '../sheet'

/**
 * An integer cell with a fallback.
 *
 * A non-empty cell that is not an integer is reported rather than quietly
 * replaced: `Number('')` reads as 0, and a typo turning `Min` into zero would
 * show up much later as a wrong number in a document.
 */
export const readInteger = (
  row: SheetRow,
  column: string,
  fallback: number,
  subject: string,
  issues: IssueCollector,
): number => {
  const raw = row.get(column)
  if (raw === '') return fallback

  const value = Number(raw)
  if (!Number.isInteger(value)) {
    issues.error(
      'value_out_of_range',
      row.at(column),
      `Sloupec \`${column}\` u \`${subject}\` musí být celé číslo, je tam „${raw}".`,
      { value: raw },
    )

    return fallback
  }

  return value
}
