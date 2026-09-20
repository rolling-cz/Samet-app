import type { CharacterAliases } from '../characters'
import { MIN_VARIATION_PRIORITY } from '../constants/scale-defaults'
import { chapterSheetName, CONTENT_COLUMNS, CONTENT_FILL_DOWN_COLUMNS } from '../constants/sheets'
import { parseCondition } from '../expression'
import type { IssueCollector } from '../issue-collector'
import type { SheetRow } from '../sheet'
import { blockMarkers } from '../template'
import type { IssueLocation } from '../types/issue'
import type { ParsedBlock, ParsedVariation } from '../types/parsed-block'
import type { ImportRepairs, Workbook } from '../types/parsed-config'
import type { ParsedGroup } from '../types/parsed-group'
import { readConfigSheet, requireColumns } from './read-config-sheet'
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

  for (const row of read.rows) {
    const blockId = row.get('Block ID')
    if (blockId === '') {
      issues.error(
        'missing_value',
        row.at('Block ID'),
        'Řádek nepatří k žádnému bloku — `Block ID` je prázdné i po doplnění sloučených buněk.',
      )
      continue
    }

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
      issues.error(
        'missing_value',
        row.at('Variation ID'),
        `Varianta bloku \`${blockId}\` nemá \`Variation ID\`.`,
      )
      continue
    }

    const previous = seenVariations.get(variationId)
    if (previous !== undefined) {
      issues.error(
        'duplicate_id',
        row.at('Variation ID'),
        `Varianta \`${variationId}\` je v listu \`${name}\` dvakrát (poprvé na řádku ${previous}).`,
        { value: variationId },
      )
      continue
    }
    seenVariations.set(variationId, row.rowNumber)

    const variation = readVariation(row, variationId, block.variations.length + 1, issues)
    if (variation) block.variations.push(variation)
  }

  return blocks
}

const readVariation = (
  row: SheetRow,
  variationId: string,
  ordinal: number,
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

  const text = row.get('Variation Text')

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
