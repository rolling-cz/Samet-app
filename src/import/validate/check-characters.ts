import { HOUSEHOLD_MEMBERS } from '../constants/household-members'
import type { IssueCollector } from '../issue-collector'
import type { ParsedConfig } from '../types/parsed-config'
import { householdExternalId } from '@/engine'

/**
 * The `Characters` registry and the households it starts the game with
 * (§11, bod 7).
 *
 * A household ID is derived from its two members (§4.2), so the column can
 * disagree with itself in two ways: the wrong number of characters carrying the
 * same value, or the right pair under an ID that is not theirs. Both would send
 * money to an account nobody owns, so both are errors.
 */
export const checkCharacters = (config: ParsedConfig, issues: IssueCollector): void => {
  for (const character of config.characters) {
    if (character.firstName !== '') continue
    issues.warn(
      'missing_value',
      character.location,
      `Postava \`${character.externalId}\` nemá jméno — v dokumentech se \`{JMENO}\` rozvine naprázdno.`,
    )
  }

  for (const household of config.households) {
    const [first, second] = household.memberIds
    if (household.memberIds.length !== HOUSEHOLD_MEMBERS || first === undefined || second === undefined) {
      issues.error(
        'invalid_household',
        household.location,
        `Domácnost \`${household.externalId}\` je ve sloupci \`Household\` u ${household.memberIds.length} postav (${household.memberIds.join(', ')}) — musí ji mít vyplněnou právě ${HOUSEHOLD_MEMBERS} postavy.`,
        { value: household.externalId },
      )
      continue
    }

    const derived = householdExternalId(first, second)
    if (derived === household.externalId) continue

    issues.error(
      'invalid_household',
      household.location,
      `Domácnost \`${household.externalId}\` neodpovídá svým členům — ID je složené z ID obou postav seřazených abecedně, tedy \`${derived}\` (§4.2).`,
      { value: household.externalId, suggestion: derived },
    )
  }
}
