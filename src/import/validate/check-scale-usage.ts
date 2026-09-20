import type { IssueCollector } from '../issue-collector'
import { splitImpactId } from '../scale-impact'
import type { ParsedConfig } from '../types/parsed-config'

/** Impact IDs any answer of the run moves. */
const touchedIds = (config: ParsedConfig): Set<string> => {
  const touched = new Set<string>()
  for (const questions of config.questions.values()) {
    for (const question of questions) {
      for (const option of question.options) {
        for (const impact of option.impacts) touched.add(impact.externalId)
      }
    }
  }

  return touched
}

/** Impact IDs any block condition reads. */
const readIds = (config: ParsedConfig): Set<string> => {
  const read = new Set<string>()
  for (const blocks of config.blocks.values()) {
    for (const block of blocks) {
      for (const variation of block.variations) {
        for (const reference of variation.condition.references) {
          if (reference.kind !== 'skala' && reference.kind !== 'zdroj') continue
          if (splitImpactId(reference.name)) read.add(reference.name)
        }
      }
    }
  }

  return read
}

/**
 * §11: a scale or resource nothing ever moves and nothing ever reads is either
 * dead weight or a misspelled ID somewhere else. A warning, not an error — the
 * author may be preparing it for a later chapter.
 *
 * Checked across the whole run rather than per chapter: state carries forward,
 * so a scale set in chapter 1 and read in chapter 3 is perfectly normal.
 */
export const checkUntouchedScales = (config: ParsedConfig, issues: IssueCollector): void => {
  const touched = touchedIds(config)
  const read = readIds(config)

  for (const row of [...config.scales, ...config.resources]) {
    if (touched.has(row.externalId) || read.has(row.externalId)) continue

    issues.warn(
      'skala_bez_dopadu',
      row.location,
      `S \`${row.externalId}\` nic nehýbe a žádná podmínka ji nečte — buď je zbytečná, nebo je někde překlep v jejím ID.`,
      { value: row.externalId },
    )
  }
}
