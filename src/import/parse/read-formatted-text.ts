/**
 * A text column that reaches a document or the questionnaire: its inline bold
 * and italic come through as Markdown (§8.2). Every other column reads the
 * plain text, so formatting never changes an ID or a condition.
 */
import type { IssueCollector } from '../issue-collector'
import type { SheetRow } from '../sheet'
import type { ImportRepairs } from '../types/parsed-config'

export const readFormattedText = (
  row: SheetRow,
  column: string,
  repairs: ImportRepairs,
  issues: IssueCollector,
): string => {
  const formatted = row.formatted(column)
  if (!formatted) return row.get(column)

  if (formatted.markdown !== row.get(column)) repairs.formattedCells++
  if (formatted.droppedFormatting) repairs.droppedFormattingCells++

  for (const marker of formatted.splitMarkers) {
    issues.error(
      'formatting_in_marker',
      row.at(column),
      `Tučné písmo nebo kurzíva začíná či končí uvnitř značky \`${marker}\` — naformátuj celou značku, nebo nic z ní.`,
      { value: marker },
    )
  }

  return formatted.markdown
}
