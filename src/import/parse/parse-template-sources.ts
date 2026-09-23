import type { CharacterAliases } from '../characters'
import { TEMPLATE_SOURCE_COLUMNS, TEMPLATE_SOURCE_FILL_DOWN_COLUMNS, TEMPLATES_SHEET } from '../constants/sheets'
import { parseGoogleDocUrl, type GoogleDocUrlError } from '../google/google-doc-url'
import type { IssueCollector } from '../issue-collector'
import type { ParsedGroup } from '../types/parsed-group'
import type { ImportRepairs, Workbook } from '../types/parsed-config'
import type { ParsedTemplateSource } from '../types/parsed-template-source'
import { readConfigSheet, requireColumns } from './read-config-sheet'
import { resolveOwner } from './resolve-character-refs'

const URL_PROBLEM: Readonly<Record<GoogleDocUrlError, string>> = Object.freeze({
  published:
    'je odkaz na publikovanou stránku (`/pub`), ta vrací HTML, ne markdown. Zkopíruj adresu z otevřeného dokumentu (`/edit?tab=…`).',
  not_a_document: 'nevede na Google dokument (tabulka, prezentace nebo Disk).',
  invalid: 'není odkaz na Google dokument.',
})

/**
 * The optional `Templates` sheet (§10.2): `Character`, `Chapter`, `URL`.
 *
 * `undefined` when the workbook has no such sheet — the upload of `.md` files
 * then stays the only way in, and nothing about Google is reported at all.
 */
export const parseTemplateSources = (
  workbook: Workbook,
  aliases: CharacterAliases,
  groups: ParsedGroup[],
  issues: IssueCollector,
  repairs: ImportRepairs,
): ParsedTemplateSource[] | undefined => {
  const read = readConfigSheet(workbook, TEMPLATES_SHEET, repairs, TEMPLATE_SOURCE_COLUMNS, TEMPLATE_SOURCE_FILL_DOWN_COLUMNS)
  if (!read) return undefined
  if (!requireColumns(TEMPLATES_SHEET, read.headers, TEMPLATE_SOURCE_COLUMNS, issues)) return []

  // A group is looked up first, by ID or by name, as in `N_Content`.
  const groupIds = new Map(groups.map((group) => [group.externalId, group.externalId]))
  for (const group of groups) groupIds.set(group.name, group.externalId)

  const sources: ParsedTemplateSource[] = []

  for (const row of read.rows) {
    const url = row.get('URL')
    // An owner listed without a link yet is reported once, as an owner without a URL.
    if (url === '') continue

    const ownerRef = row.get('Character')
    const rawChapter = row.get('Chapter')
    const chapter = Number(rawChapter)
    if (rawChapter === '' || !Number.isInteger(chapter)) {
      issues.error(
        'value_out_of_range',
        row.at('Chapter'),
        `Sloupec \`Chapter\` musí být číslo kapitoly, je tam „${rawChapter}".`,
        { value: rawChapter },
      )
      continue
    }

    const groupId = groupIds.get(ownerRef)
    const characterId =
      groupId === undefined
        ? resolveOwner(ownerRef, aliases, repairs, row.at('Character'), `Šablona na řádku ${row.rowNumber}`, issues, row.raw('Character') !== '')
        : undefined
    const owner =
      groupId !== undefined
        ? ({ kind: 'group', id: groupId } as const)
        : characterId !== undefined
          ? ({ kind: 'character', id: characterId } as const)
          : undefined

    const parsed = parseGoogleDocUrl(url)
    if (parsed._type === 'error') {
      issues.error('invalid_template_url', row.at('URL'), `Adresa \`${url}\` ${URL_PROBLEM[parsed.reason]}`, { value: url })
    } else if (parsed.ref.tabId === undefined) {
      issues.warn(
        'template_url_without_tab',
        row.at('URL'),
        `Adresa nenese kartu (\`?tab=…\`), stáhne se celý dokument. Otevři správnou kartu a zkopíruj adresu znovu.`,
        { value: url },
      )
    }

    sources.push({
      ownerRef,
      owner,
      chapter,
      url,
      ref: parsed._type === 'ok' ? parsed.ref : undefined,
      location: row.at('URL'),
    })
  }

  return sources
}
