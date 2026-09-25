import { chapterSheetName } from '../constants/sheets'
import type { IssueCollector } from '../issue-collector'
import { KNOWN_VARIABLES } from '../template'
import type { ParsedConfig } from '../types/parsed-config'
import type { ParsedTemplate } from '../types/parsed-template'
import { printedChapters, templateCoverage, templateWins } from '../template-upload'
import { suggestClosest } from '../utils/suggest-closest'
import { blocksDecidingQuestions } from './check-question-conditions'

/** `{S_Regime}` prints a scale value; the prefix is the author's. */
const SCALE_VARIABLE_PREFIX = 'S_'

/** `{R_Wealth}` prints a resource value. */
const RESOURCE_VARIABLE_PREFIX = 'R_'

/** Block IDs are `B_<Postava>_<Kapitola>_<Tema>_<Poradi>`. */
const BLOCK_ID_PREFIX = 'B_'

/** `{R_Wealth_private}` prints the personal account whatever the marital status (§4.4). */
const PRIVATE_SUFFIX = '_private'

/**
 * §8.4: a `{BLOK}` marker with no record in `N_Content` and a block in
 * `N_Content` with no marker pointing at it are both errors — in the first case
 * the marker would survive into the printed document.
 *
 * A block reachable only from another block's `Variation Text` counts as
 * marked: nesting is a legitimate way in (§11, 6g). So does a block a
 * question's `Condition` points at — it exists to decide the question (§8.2).
 */
export const checkTemplates = (
  config: ParsedConfig,
  templates: ParsedTemplate[],
  issues: IssueCollector,
): void => {
  // A template of an unprinted chapter is never filled, so its markers can mislead nobody.
  const printed = printedChapters(config)
  const used = templates.filter((template) => template.chapter === undefined || printed.includes(template.chapter))

  const allBlocks = new Map<string, number>()
  const blockOwners = new Map<string, string | undefined>()
  for (const [chapter, blocks] of config.blocks) {
    for (const block of blocks) {
      allBlocks.set(block.externalId, chapter)
      blockOwners.set(block.externalId, block.characterId ?? block.groupId)
    }
  }

  const scaleKeys = new Set(config.scales.map((row) => row.key))
  const resourceKeys = new Set(config.resources.map((row) => row.key))

  const knownVariables: string[] = [...KNOWN_VARIABLES]
  for (const key of scaleKeys) knownVariables.push(`${SCALE_VARIABLE_PREFIX}${key}`)
  for (const key of resourceKeys) {
    knownVariables.push(`${RESOURCE_VARIABLE_PREFIX}${key}`, `${RESOURCE_VARIABLE_PREFIX}${key}${PRIVATE_SUFFIX}`)
  }

  const markedBlocks = blocksDecidingQuestions(config)
  for (const blocks of config.blocks.values()) {
    for (const block of blocks) {
      for (const variation of block.variations) {
        for (const nested of variation.nestedBlocks) markedBlocks.add(nested)
      }
    }
  }

  for (const template of used) {
    const location = { sheet: template.filename }

    for (const problem of template.problems) {
      issues.error(
        'invalid_template_marker',
        { ...location, row: problem.line },
        `Šablona \`${template.filename}\`, řádek ${problem.line}: ${problem.detail}.`,
        { value: problem.raw },
      )
    }

    for (const blockId of template.blockIds) {
      markedBlocks.add(blockId)
      if (allBlocks.has(blockId)) {
        checkBlockBelongs(template, blockId, allBlocks.get(blockId), blockOwners.get(blockId), issues)
        continue
      }
      issues.error(
        'marker_without_block',
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
      const resourceName = variable.startsWith(RESOURCE_VARIABLE_PREFIX)
        ? variable.slice(RESOURCE_VARIABLE_PREFIX.length)
        : undefined
      const isResource =
        resourceName !== undefined &&
        (resourceKeys.has(resourceName) ||
          (resourceName.endsWith(PRIVATE_SUFFIX) &&
            resourceKeys.has(resourceName.slice(0, -PRIVATE_SUFFIX.length))))
      if (isKnown || isScale || isResource) continue

      // `{B_Antonin_1_Historie_2}` — a block ID without the keyword, as the authors' drafts write it.
      if (allBlocks.has(variable) || variable.startsWith(BLOCK_ID_PREFIX)) {
        issues.error(
          'invalid_template_marker',
          location,
          `Šablona \`${template.filename}\` obsahuje \`{${variable}}\` — vypadá to na blok, ale značce chybí slovo \`BLOK\`. Správně je \`{BLOK ${variable}}\`.`,
          { value: variable, suggestion: `BLOK ${variable}` },
        )
        continue
      }

      issues.error(
        'invalid_template_marker',
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
      'block_without_marker',
      { sheet },
      `Blok \`${blockId}\` je v listu \`${sheet}\`, ale žádná nahraná šablona ani text jiné varianty na něj nemá značku \`{BLOK ${blockId}}\` a neodkazuje na něj ani sloupec \`Condition\` žádné otázky — k ničemu se nepoužije.`,
      { value: blockId },
    )
  }

  checkCoverage(config, templates, issues)
}

/**
 * A template of owner X and chapter N may only print X's blocks from
 * `N_Content`. Beyond catching a wrong marker, this is the guard behind loading
 * a Google Docs tab: that export is undocumented, and if it ever came back as
 * the whole document, the other tabs' markers would land here and fail loudly
 * instead of printing someone else's text.
 */
const checkBlockBelongs = (
  template: ParsedTemplate,
  blockId: string,
  blockChapter: number | undefined,
  blockOwner: string | undefined,
  issues: IssueCollector,
): void => {
  if (template.ownerRef === undefined || template.chapter === undefined) return

  const sameOwner = blockOwner !== undefined && blockOwner.toLowerCase() === template.ownerRef.toLowerCase()
  if (sameOwner && blockChapter === template.chapter) return

  issues.error(
    'foreign_template_block',
    { sheet: template.filename },
    `Šablona \`${template.filename}\` (${template.ownerRef}, kapitola ${template.chapter}) obsahuje značku \`{BLOK ${blockId}}\`, ale ten blok patří \`${blockOwner ?? '?'}\` v listu \`${blockChapter ?? '?'}_Content\`. Šablona smí tisknout jen bloky svého vlastníka z listu své kapitoly.`,
    { value: blockId },
  )
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
      'invalid_template_filename',
      { sheet: template.filename },
      `Šablona \`${template.filename}\` nepatří žádné postavě ani skupině — název musí být \`<ID>_<kapitola>.md\`, například \`Marie_2.md\`.`,
      { value: template.filename },
    )
  }

  const [firstNotPrinted] = coverage.notPrinted
  if (firstNotPrinted) {
    issues.warn(
      'template_not_printed',
      { sheet: firstNotPrinted.filename },
      `Šablony kapitoly ${firstNotPrinted.chapter} (${coverage.notPrinted.length}) se nepoužijí — dokumenty kapitoly ${firstNotPrinted.chapter} aplikace netiskne, jsou předem dané.`,
      { value: coverage.notPrinted.map((template) => template.filename).join(', ') },
    )
  }

  for (const { overridden, used } of coverage.duplicates) {
    const which = templateWins(used, overridden) ? 'ta z Googlu — nahrané soubory jsou jen záloha' : 'ta nahraná později'
    issues.warn(
      'duplicate_template',
      { sheet: overridden.filename },
      `Pro \`${overridden.ownerRef}\`, kapitolu ${overridden.chapter}, přišly dvě šablony. Použije se ${which}: \`${used.filename}\`.`,
      { value: `${overridden.ownerRef}_${overridden.chapter}` },
    )
  }

  for (const assignment of coverage.assignments) {
    if (assignment.status === 'assigned') continue
    issues.error(
      'owner_without_template',
      { sheet: assignment.ownerKind === 'character' ? 'Characters' : 'Groups' },
      `${assignment.ownerKind === 'character' ? 'Postava' : 'Skupina'} \`${assignment.ownerExternalId}\` nemá šablonu pro kapitolu ${assignment.chapter} — chybí soubor \`${assignment.ownerExternalId}_${assignment.chapter}.md\`.`,
      { value: assignment.ownerExternalId },
    )
  }
}
