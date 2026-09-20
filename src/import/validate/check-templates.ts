import { chapterSheetName } from '../constants/sheets'
import type { IssueCollector } from '../issue-collector'
import { KNOWN_VARIABLES } from '../template'
import type { ParsedConfig } from '../types/parsed-config'
import type { ParsedTemplate } from '../types/parsed-template'
import { templateCoverage } from '../template-upload'
import { suggestClosest } from '../utils/suggest-closest'

/** `{S_Regime}` prints a scale value; the prefix is the author's. */
const SCALE_VARIABLE_PREFIX = 'S_'

/** `{R_Wealth}` prints a resource value. */
const RESOURCE_VARIABLE_PREFIX = 'R_'

/**
 * §8.4: a `{BLOK}` marker with no record in `N_Content` and a block in
 * `N_Content` with no marker pointing at it are both errors — in the first case
 * the marker would survive into the printed document.
 *
 * A block reachable only from another block's `Variation Text` counts as
 * marked: nesting is a legitimate way in (§11, 6g).
 */
export const checkTemplates = (
  config: ParsedConfig,
  templates: ParsedTemplate[],
  issues: IssueCollector,
): void => {
  const allBlocks = new Map<string, number>()
  for (const [chapter, blocks] of config.blocks) {
    for (const block of blocks) allBlocks.set(block.externalId, chapter)
  }

  const scaleKeys = new Set(config.scales.map((row) => row.key))
  const resourceKeys = new Set(config.resources.map((row) => row.key))

  const knownVariables: string[] = [...KNOWN_VARIABLES]
  for (const key of scaleKeys) knownVariables.push(`${SCALE_VARIABLE_PREFIX}${key}`)
  for (const key of resourceKeys) knownVariables.push(`${RESOURCE_VARIABLE_PREFIX}${key}`)

  const markedBlocks = new Set<string>()
  for (const blocks of config.blocks.values()) {
    for (const block of blocks) {
      for (const variation of block.variations) {
        for (const nested of variation.nestedBlocks) markedBlocks.add(nested)
      }
    }
  }

  for (const template of templates) {
    const location = { sheet: template.filename }

    for (const problem of template.problems) {
      issues.error(
        'vadna_znacka_sablony',
        { ...location, row: problem.line },
        `Šablona \`${template.filename}\`, řádek ${problem.line}: ${problem.detail}.`,
        { value: problem.raw },
      )
    }

    for (const blockId of template.blockIds) {
      markedBlocks.add(blockId)
      if (allBlocks.has(blockId)) continue
      issues.error(
        'znacka_bez_bloku',
        location,
        `Šablona \`${template.filename}\` obsahuje značku \`{BLOK ${blockId}}\`, ale blok \`${blockId}\` není v žádném listu \`N_Content\` — značka by zůstala v hotovém dokumentu.`,
        { value: blockId, suggestion: suggestClosest(blockId, allBlocks.keys()) },
      )
    }

    for (const variable of template.variables) {
      const isKnown = (KNOWN_VARIABLES as readonly string[]).includes(variable)
      const isScale =
        variable.startsWith(SCALE_VARIABLE_PREFIX) &&
        scaleKeys.has(variable.slice(SCALE_VARIABLE_PREFIX.length))
      const isResource =
        variable.startsWith(RESOURCE_VARIABLE_PREFIX) &&
        resourceKeys.has(variable.slice(RESOURCE_VARIABLE_PREFIX.length))
      if (isKnown || isScale || isResource) continue

      issues.error(
        'vadna_znacka_sablony',
        location,
        `Šablona \`${template.filename}\` používá proměnnou \`{${variable}}\`, kterou aplikace neumí naplnit — zůstala by v hotovém dokumentu.`,
        { value: variable, suggestion: suggestClosest(variable, knownVariables) },
      )
    }
  }

  for (const [blockId, chapter] of allBlocks) {
    if (markedBlocks.has(blockId)) continue
    const sheet = chapterSheetName(chapter, 'Content')
    issues.error(
      'blok_bez_znacky',
      { sheet },
      `Blok \`${blockId}\` je v listu \`${sheet}\`, ale žádná nahraná šablona ani text jiné varianty na něj nemá značku \`{BLOK ${blockId}}\` — jeho text se nikam nedostane.`,
      { value: blockId },
    )
  }

  checkCoverage(config, templates, issues)
}

/**
 * §10.2: the file name says who a template belongs to and for which chapter, so
 * a name that parses to nobody is a mistake the org can fix by renaming, and a
 * character or group missing a chapter's template has no document to print.
 */
const checkCoverage = (
  config: ParsedConfig,
  templates: ParsedTemplate[],
  issues: IssueCollector,
): void => {
  const coverage = templateCoverage(config, templates)

  for (const template of coverage.unmatched) {
    issues.error(
      'neplatny_nazev_sablony',
      { sheet: template.filename },
      `Šablona \`${template.filename}\` nepatří žádné postavě ani skupině — název musí být \`<ID>_<kapitola>.md\`, například \`Marie_2.md\`.`,
      { value: template.filename },
    )
  }

  for (const assignment of coverage.assignments) {
    if (assignment.status === 'prirazena') continue
    issues.error(
      'postava_bez_sablony',
      { sheet: assignment.ownerKind === 'postava' ? 'Characters' : 'Groups' },
      `${assignment.ownerKind === 'postava' ? 'Postava' : 'Skupina'} \`${assignment.ownerExternalId}\` nemá šablonu pro kapitolu ${assignment.chapter} — chybí soubor \`${assignment.ownerExternalId}_${assignment.chapter}.md\`.`,
      { value: assignment.ownerExternalId },
    )
  }
}
