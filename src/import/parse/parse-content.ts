import type { CharacterAliases } from '../characters'
import { MIN_VARIATION_PRIORITY } from '../constants/scale-defaults'
import {
  BIOGRAPHY_TEXT_COLUMN,
  BIOGRAPHY_YEAR_COLUMN,
  chapterSheetName,
  CONTENT_COLUMNS,
  CONTENT_FILL_DOWN_COLUMNS,
  VARIATION_BODY_COLUMNS,
} from '../constants/sheets'
import { parseCondition } from '../expression'
import type { IssueCollector } from '../issue-collector'
import type { SheetRow } from '../sheet'
import { BIOGRAPHY_VARIABLE, blockMarkers, parseTemplate } from '../template'
import type { IssueLocation } from '../types/issue'
import type { ParsedBiographyEntry, ParsedBlock, ParsedVariation } from '../types/parsed-block'
import type { ImportRepairs, Workbook } from '../types/parsed-config'
import type { ParsedGroup } from '../types/parsed-group'
import { readConfigSheet, requireColumns } from './read-config-sheet'
import { readFormattedText } from './read-formatted-text'
import { resolveOwner } from './resolve-character-refs'

export const parseContent = (
  workbook: Workbook,
  chapter: number,
  aliases: CharacterAliases,
  groups: ParsedGroup[],
  issues: IssueCollector,
  repairs: ImportRepairs,
): ParsedBlock[] => {
  const name = chapterSheetName(chapter, 'Content')
  const read = readConfigSheet(workbook, name, repairs, CONTENT_COLUMNS, CONTENT_FILL_DOWN_COLUMNS)
  // Content is optional: a chapter whose documents are not generated has none.
  if (!read) return []
  if (!requireColumns(name, read.headers, CONTENT_COLUMNS, issues)) return []

  const groupIds = new Map(groups.map((group) => [group.externalId, group.externalId]))
  for (const group of groups) groupIds.set(group.name, group.externalId)

  const blocks: ParsedBlock[] = []
  const byId = new Map<string, ParsedBlock>()
  const seenVariations = new Map<string, number>()
  /**
   * The variant read on the row directly above, if it was valid. A continuation
   * row attaches only to it — never to an earlier variant past a broken row.
   */
  let previous: ParsedVariation | undefined

  for (const row of read.rows) {
    const blockId = row.get('Block ID')
    if (blockId === '') {
      previous = undefined
      issues.error(
        'missing_value',
        row.at('Block ID'),
        'Řádek nepatří k žádnému bloku — `Block ID` je prázdné i po doplnění sloučených buněk.',
      )
      continue
    }
    if (row.raw('Block ID') !== '') previous = undefined

    let block = byId.get(blockId)
    if (!block) {
      const ownerRef = row.get('Character')
      // The column holds a character or a group (§8.2); a group is looked up
      // first because its ID never collides with a character's in practice and
      // the character resolver would otherwise warn about a perfectly good name.
      const groupId = groupIds.get(ownerRef)
      block = {
        externalId: blockId,
        chapter,
        ownerRef,
        groupId,
        characterId: groupId
          ? undefined
          : resolveOwner(
              ownerRef,
              aliases,
              repairs,
              row.at('Character'),
              `Blok \`${blockId}\``,
              issues,
            ),
        variations: [],
        location: row.at('Block ID'),
      }
      byId.set(blockId, block)
      blocks.push(block)
    }

    const variationId = row.get('Variation ID')
    if (variationId === '') {
      if (!readContinuation(row, blockId, previous, repairs, issues)) previous = undefined
      continue
    }

    const firstRow = seenVariations.get(variationId)
    if (firstRow !== undefined) {
      previous = undefined
      issues.error(
        'duplicate_id',
        row.at('Variation ID'),
        `Varianta \`${variationId}\` je v listu \`${name}\` dvakrát (poprvé na řádku ${firstRow}).`,
        { value: variationId },
      )
      continue
    }
    seenVariations.set(variationId, row.rowNumber)

    previous = readVariation(row, variationId, block.variations.length + 1, repairs, issues)
    if (previous) block.variations.push(previous)
  }

  return blocks
}

const hasBiography = (row: SheetRow): boolean =>
  row.get(BIOGRAPHY_YEAR_COLUMN) !== '' || row.get(BIOGRAPHY_TEXT_COLUMN) !== ''

/**
 * A row without `Variation ID` is another biography entry of the variant above
 * (§8.2) — but only when it holds nothing else. Anything more is an error, never
 * text silently glued onto someone else's variant. True when the row was read.
 */
const readContinuation = (
  row: SheetRow,
  blockId: string,
  previous: ParsedVariation | undefined,
  repairs: ImportRepairs,
  issues: IssueCollector,
): boolean => {
  const missingId = `Varianta bloku \`${blockId}\` nemá \`Variation ID\``
  if (!hasBiography(row)) {
    issues.error('missing_value', row.at('Variation ID'), `${missingId}.`)

    return false
  }

  if (row.raw('Block ID') !== '') {
    issues.error(
      'missing_value',
      row.at('Variation ID'),
      `${missingId}. Řádek s bodem životopisu bez \`Variation ID\` je pokračovací a patří pod variantu — nesmí blok začínat.`,
    )

    return false
  }

  const filled = VARIATION_BODY_COLUMNS.filter((column) => row.get(column) !== '')
  if (filled.length > 0) {
    issues.error(
      'missing_value',
      row.at('Variation ID'),
      `${missingId}, ale kromě bodu životopisu má vyplněné ${filled.map((column) => `\`${column}\``).join(', ')}. Buď doplň \`Variation ID\` nové varianty, nebo na řádku nech jen \`${BIOGRAPHY_YEAR_COLUMN}\` a \`${BIOGRAPHY_TEXT_COLUMN}\`.`,
    )

    return false
  }

  if (!previous) {
    issues.error(
      'missing_value',
      row.at('Variation ID'),
      `Pokračovací řádek s bodem životopisu nemá nad sebou platnou variantu bloku \`${blockId}\` — řádek nad ním chybí nebo je vadný.`,
    )

    return false
  }

  const entry = readBiography(row, previous.externalId, repairs, issues)
  if (!entry) return false
  previous.biography.push(entry)

  return true
}

/** The biography entry on this row, if any (§8.2). Year and text belong together. */
const readBiography = (
  row: SheetRow,
  variationId: string,
  repairs: ImportRepairs,
  issues: IssueCollector,
): ParsedBiographyEntry | undefined => {
  const yearRaw = row.get(BIOGRAPHY_YEAR_COLUMN)
  const plainText = row.get(BIOGRAPHY_TEXT_COLUMN)
  if (yearRaw === '' && plainText === '') return undefined

  if (yearRaw === '') {
    issues.error(
      'missing_value',
      row.at(BIOGRAPHY_YEAR_COLUMN),
      `Bod životopisu varianty \`${variationId}\` nemá rok — \`${BIOGRAPHY_YEAR_COLUMN}\` a \`${BIOGRAPHY_TEXT_COLUMN}\` se vyplňují jen spolu.`,
    )

    return undefined
  }
  if (plainText === '') {
    issues.error(
      'missing_value',
      row.at(BIOGRAPHY_TEXT_COLUMN),
      `Bod životopisu varianty \`${variationId}\` má rok ${yearRaw}, ale nemá text.`,
    )

    return undefined
  }

  const year = Number(yearRaw)
  if (!Number.isInteger(year)) {
    issues.error(
      'invalid_biography',
      row.at(BIOGRAPHY_YEAR_COLUMN),
      `Rok bodu životopisu varianty \`${variationId}\` musí být celé číslo, je tam „${yearRaw}".`,
      { value: yearRaw },
    )

    return undefined
  }

  const text = readFormattedText(row, BIOGRAPHY_TEXT_COLUMN, repairs, issues)
  // A biography line is printed into `{ZIVOTOPIS}` after every block is expanded,
  // so a block marker in it would never be filled.
  const markers = parseTemplate(text)
  const forbidden = [
    ...markers.blockIds.map((id) => `{BLOK ${id}}`),
    ...(markers.variables.includes(BIOGRAPHY_VARIABLE) ? [`{${BIOGRAPHY_VARIABLE}}`] : []),
  ]
  if (forbidden.length > 0) {
    issues.error(
      'invalid_biography',
      row.at(BIOGRAPHY_TEXT_COLUMN),
      `Bod životopisu varianty \`${variationId}\` obsahuje ${forbidden.map((marker) => `\`${marker}\``).join(', ')} — v bodu smějí být jen proměnné jako \`{JMENO}\`.`,
      { value: forbidden.join(', ') },
    )

    return undefined
  }

  return { year, text, row: row.rowNumber, location: row.at(BIOGRAPHY_TEXT_COLUMN) }
}

const readVariation = (
  row: SheetRow,
  variationId: string,
  ordinal: number,
  repairs: ImportRepairs,
  issues: IssueCollector,
): ParsedVariation | undefined => {
  const priority = readPriority(row.get('Priority'), variationId, row.at('Priority'), issues)
  if (priority === 'invalid') return undefined

  const condition = parseCondition(row.get('Conditions'))
  if (!condition.ok) {
    issues.error(
      'invalid_expression',
      row.at('Conditions'),
      `Podmínka varianty \`${variationId}\` je syntakticky vadná: ${condition.error}.`,
      { value: condition.raw },
    )
  }

  const text = readFormattedText(row, 'Variation Text', repairs, issues)
  if (parseTemplate(text).variables.includes(BIOGRAPHY_VARIABLE)) {
    issues.error(
      'invalid_biography',
      row.at('Variation Text'),
      `Text varianty \`${variationId}\` obsahuje \`{${BIOGRAPHY_VARIABLE}}\` — životopis patří jen do šablony, jednou.`,
      { value: `{${BIOGRAPHY_VARIABLE}}` },
    )
  }
  const entry = readBiography(row, variationId, repairs, issues)

  return {
    externalId: variationId,
    ordinal,
    priority,
    description: row.get('Variation Description'),
    // Empty text is legitimate — the "nothing happened" variant (§8.2).
    text,
    // A variant's text may hold another block's marker; the substitution runs
    // in a loop until none is left (§8.4). A marker pointing back at this very
    // block is kept, because that is the shortest cycle there is.
    nestedBlocks: blockMarkers(text),
    condition,
    isFallback: condition.isDefault,
    biography: entry ? [entry] : [],
    location: row.at('Variation ID'),
  }
}

/**
 * `Priority` is optional (§8.2): when no variant of a block has one, row order
 * decides. An empty cell is therefore not an error — only a cell that is filled
 * in and unreadable is.
 */
const readPriority = (
  raw: string,
  variationId: string,
  location: IssueLocation,
  issues: IssueCollector,
): number | undefined | 'invalid' => {
  if (raw === '') return undefined

  const priority = Number(raw)
  if (!Number.isInteger(priority) || priority < MIN_VARIATION_PRIORITY) {
    issues.error(
      'missing_value',
      location,
      `Varianta \`${variationId}\` má neplatnou prioritu „${raw}" — čeká se celé číslo od ${MIN_VARIATION_PRIORITY}, nebo prázdná buňka.`,
      { value: raw },
    )

    return 'invalid'
  }

  return priority
}
