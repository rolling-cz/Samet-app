import type { IssueCollector } from '../issue-collector'
import type { ParsedConfig } from '../types/parsed-config'
import { suggestClosest } from '../utils/suggest-closest'

/**
 * The `Scales` and `Resources` sheets (§11, bod 7).
 *
 * Bounds belong to the pair character × scale, so every row is checked on its
 * own: `Min` above `Max` and a default outside the range are both errors, not
 * something to clamp quietly — a wrong starting value is wrong numbers in
 * every document of the run.
 */
export const checkScales = (config: ParsedConfig, issues: IssueCollector): void => {
  const characterIds = new Set(config.characters.map((character) => character.externalId))

  for (const row of config.scales) {
    if (row.characterId === undefined) {
      issues.error(
        'neznama_postava',
        row.location,
        `Škála \`${row.key}\` je vedená na postavu \`${row.characterRef}\`, která není v listu \`Characters\`.`,
        { value: row.characterRef, suggestion: suggestClosest(row.characterRef, characterIds) },
      )
    }

    if (row.min >= row.max) {
      issues.error(
        'hodnota_mimo_rozsah',
        row.location,
        `Škála \`${row.externalId}\` má \`Min\` ${row.min} a \`Max\` ${row.max} — dolní hranice musí být menší než horní.`,
        { value: `${row.min}-${row.max}` },
      )
      continue
    }

    if (row.defaultValue < row.min || row.defaultValue > row.max) {
      issues.error(
        'hodnota_mimo_rozsah',
        row.location,
        `Výchozí hodnota ${row.defaultValue} škály \`${row.externalId}\` je mimo rozsah ${row.min}–${row.max}.`,
        { value: String(row.defaultValue) },
      )
    }
  }

  for (const row of config.resources) {
    if (row.characterId !== undefined) continue
    issues.error(
      'neznama_postava',
      row.location,
      `Zdroj \`${row.key}\` je vedený na postavu \`${row.characterRef}\`, která není v listu \`Characters\`.`,
      { value: row.characterRef, suggestion: suggestClosest(row.characterRef, characterIds) },
    )
  }
}
