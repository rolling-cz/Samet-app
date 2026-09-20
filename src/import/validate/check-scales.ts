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
        'unknown_character',
        row.location,
        `Škála \`${row.key}\` je vedená na postavu \`${row.characterRef}\`, která není v listu \`Characters\`.`,
        { value: row.characterRef, suggestion: suggestClosest(row.characterRef, characterIds) },
      )
    }

    if (row.min >= row.max) {
      issues.error(
        'value_out_of_range',
        row.location,
        `Škála \`${row.externalId}\` má \`Min\` ${row.min} a \`Max\` ${row.max} — dolní hranice musí být menší než horní.`,
        { value: `${row.min}-${row.max}` },
      )
      continue
    }

    if (row.defaultValue < row.min || row.defaultValue > row.max) {
      issues.error(
        'value_out_of_range',
        row.location,
        `Výchozí hodnota ${row.defaultValue} škály \`${row.externalId}\` je mimo rozsah ${row.min}–${row.max}.`,
        { value: String(row.defaultValue) },
      )
    }
  }

  const defaultHouseholds = new Set(config.households.map((household) => household.externalId))
  const withBalance = new Map<string, Set<string>>()

  for (const row of config.resources) {
    if (row.householdRef !== undefined) {
      if (defaultHouseholds.has(row.householdRef)) {
        const keys = withBalance.get(row.householdRef) ?? new Set<string>()
        keys.add(row.key)
        withBalance.set(row.householdRef, keys)
        continue
      }

      issues.error(
        'invalid_household',
        row.location,
        `Zdroj \`${row.externalId}\` je vedený na domácnost \`${row.householdRef}\`, která není ve sloupci \`Household\` listu \`Characters\` — společný účet má jen domácnost, se kterou hra začíná (§4.2).`,
        {
          value: row.householdRef,
          suggestion: suggestClosest(row.householdRef, defaultHouseholds),
        },
      )
      continue
    }

    if (row.characterId !== undefined) continue
    issues.error(
      'unknown_character',
      row.location,
      `Zdroj \`${row.key}\` je vedený na postavu \`${row.characterRef}\`, která není v listu \`Characters\`.`,
      { value: row.characterRef, suggestion: suggestClosest(row.characterRef, characterIds) },
    )
  }

  checkOpeningBalances(config, withBalance, issues)
}

/**
 * A household the game starts with needs its joint account's opening balance
 * (§4.2): nothing is quietly filled in with a zero, because a balance nobody
 * wrote is a number nobody checked.
 *
 * Only shared resources are required — a `private` one has no joint account to
 * open.
 */
const checkOpeningBalances = (
  config: ParsedConfig,
  withBalance: Map<string, Set<string>>,
  issues: IssueCollector,
): void => {
  const sharedKeys = new Set<string>()
  for (const row of config.resources) {
    if (row.scope === 'household') sharedKeys.add(row.key)
  }
  if (sharedKeys.size === 0) return

  for (const household of config.households) {
    const present = withBalance.get(household.externalId)
    for (const key of sharedKeys) {
      if (present?.has(key)) continue
      issues.error(
        'invalid_household',
        household.location,
        `Výchozí domácnost \`${household.externalId}\` nemá v listu \`Resources\` řádek \`R_${household.externalId}_${key}\` — počáteční zůstatek společného účtu se nedoplňuje nulou (§4.2).`,
        { value: `R_${household.externalId}_${key}` },
      )
    }
  }
}
