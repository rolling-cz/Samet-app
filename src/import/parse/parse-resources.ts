import type { CharacterAliases } from '../characters'
import { DEFAULT_RESOURCE_VALUE } from '../constants/scale-defaults'
import { RESOURCE_SCOPES } from '../constants/sheet-vocabulary'
import { RESOURCE_COLUMNS, RESOURCES_SHEET, SCALE_FILL_DOWN_COLUMNS } from '../constants/sheets'
import type { IssueCollector } from '../issue-collector'
import { splitImpactId } from '../scale-impact'
import type { IssueLocation } from '../types/issue'
import type { ImportRepairs, Workbook } from '../types/parsed-config'
import type { ParsedResourceRow } from '../types/parsed-resource'
import { readConfigSheet, requireColumns } from './read-config-sheet'
import { readInteger } from './read-number'
import { resolveOwner } from './resolve-character-refs'

/**
 * Default scope when the sheet does not say (§4.4).
 *
 * `household` on purpose: the author's own note is "defaultně všechny, protože
 * momentálně budeme mít jen Wealth". A resource that turns out to be personal
 * loses nothing by also having a joint account nobody uses, while the opposite
 * mistake would make `R_MarieMirek_Wealth` fail to resolve.
 */
const DEFAULT_RESOURCE_SCOPE: ParsedResourceRow['scope'] = 'household'

/**
 * The `Resources` sheet (§4.2): which resources a character holds and with what
 * starting value. No `Min` / `Max` — a resource is unbounded (§4.1).
 *
 * `Scope`, when the sheet has the column, says whether the resource can also
 * live on a joint account. It describes the resource, not the pair, so the
 * first row wins and a row that disagrees is reported rather than applied.
 */
export const parseResources = (
  workbook: Workbook,
  aliases: CharacterAliases,
  issues: IssueCollector,
  repairs: ImportRepairs,
): ParsedResourceRow[] => {
  const read = readConfigSheet(
    workbook,
    RESOURCES_SHEET,
    repairs,
    RESOURCE_COLUMNS,
    SCALE_FILL_DOWN_COLUMNS,
  )
  // Optional: a run may have no money in play at all.
  if (!read) return []
  if (!requireColumns(RESOURCES_SHEET, read.headers, RESOURCE_COLUMNS, issues)) return []

  const rows: ParsedResourceRow[] = []
  const seen = new Map<string, number>()
  const scopeByKey = new Map<string, ParsedResourceRow['scope']>()

  for (const row of read.rows) {
    const characterRef = row.get('Character')
    const externalId = row.get('ID')
    if (externalId === '') {
      issues.error('chybejici_hodnota', row.at('ID'), 'Řádek nemá `ID` zdroje.')
      continue
    }

    const parts = splitImpactId(externalId)
    if (!parts || parts.kind !== 'zdroj') {
      issues.error(
        'chybejici_hodnota',
        row.at('ID'),
        `\`${externalId}\` není ID zdroje — čeká se tvar \`R_<Vlastnik>_<Zdroj>\`.`,
        { value: externalId },
      )
      continue
    }
    const key = parts.key

    if (characterRef === '') {
      issues.error(
        'chybejici_hodnota',
        row.at('Character'),
        `Zdroj \`${externalId}\` nemá postavu — každý řádek je dvojice postava × zdroj.`,
      )
      continue
    }

    const characterId = resolveOwner(
      characterRef,
      aliases,
      repairs,
      row.at('Character'),
      `Zdroj \`${externalId}\``,
      issues,
    )

    const previous = seen.get(externalId)
    if (previous !== undefined) {
      issues.error(
        'duplicitni_id',
        row.at('ID'),
        `Dvojice postava × zdroj \`${externalId}\` je v listu \`${RESOURCES_SHEET}\` dvakrát (poprvé na řádku ${previous}).`,
        { value: externalId },
      )
      continue
    }
    seen.set(externalId, row.rowNumber)

    rows.push({
      externalId,
      characterRef,
      characterId,
      key,
      label: row.get('Name') || key,
      scope: readScope(row.get('Scope'), key, scopeByKey, row.at('Scope'), issues),
      defaultValue: readInteger(row, 'Default', DEFAULT_RESOURCE_VALUE, externalId, issues),
      location: row.at('ID'),
    })
  }

  return rows
}

const readScope = (
  raw: string,
  key: string,
  scopeByKey: Map<string, ParsedResourceRow['scope']>,
  location: IssueLocation,
  issues: IssueCollector,
): ParsedResourceRow['scope'] => {
  const known = RESOURCE_SCOPES.find((scope) => scope === raw)
  if (raw !== '' && !known) {
    issues.error(
      'chybejici_hodnota',
      location,
      `Zdroj \`${key}\` má neznámý rozsah „${raw}" — čeká se ${RESOURCE_SCOPES.map((s) => `\`${s}\``).join(' nebo ')}.`,
      { value: raw },
    )
  }

  const agreed = scopeByKey.get(key)
  const scope = known ?? agreed ?? DEFAULT_RESOURCE_SCOPE

  if (agreed !== undefined && known !== undefined && agreed !== known) {
    issues.error(
      'chybejici_hodnota',
      location,
      `Zdroj \`${key}\` má na různých řádcích různý rozsah (\`${agreed}\` a \`${known}\`) — rozsah patří zdroji, ne dvojici, takže musí být všude stejný.`,
      { value: raw },
    )
  }
  scopeByKey.set(key, scope)

  return scope
}
