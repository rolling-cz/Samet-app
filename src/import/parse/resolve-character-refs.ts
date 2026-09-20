/** Resolving `Character` cells and characters named by answer options. */
import { resolveCharacter, type CharacterAliases } from '../characters'
import type { IssueCollector } from '../issue-collector'
import type { IssueLocation } from '../types/issue'
import type { ImportRepairs } from '../types/parsed-config'
import type { ParsedAnswerOption } from '../types/parsed-question'

/**
 * Resolves the owning `Character` cell, tolerating the name where the registry
 * has an ID (`Věra` for `Vera`). A resolved name is a warning, not an error:
 * the sheet is worth fixing, but one habit of the author must not block the
 * whole config. An unknown value is left to the validation to report.
 */
export const resolveOwner = (
  value: string,
  aliases: CharacterAliases,
  repairs: ImportRepairs,
  location: IssueLocation,
  subject: string,
  issues: IssueCollector,
  /**
   * False when the cell was carried down rather than written here. The author
   * typed the name once; repeating the warning for every row that inherits it
   * would bury the one place they have to fix.
   */
  wasWritten = true,
): string | undefined => {
  const resolved = resolveCharacter(value, aliases)
  if (resolved.status === 'unknown') return undefined

  if (resolved.status === 'by_name' && wasWritten) {
    repairs.resolvedCharacterNames++
    issues.warn(
      'unknown_character',
      location,
      `${subject} je vedená na „${value}", což není ID z listu \`Characters\` — import to přiřadil postavě \`${resolved.id}\` podle jména. V tabulce patří ID.`,
      { value, suggestion: resolved.id },
    )
  }

  return resolved.id
}

/**
 * Which character an option names (§6.6). An option that names another
 * character must reference the registry ID, never free text — otherwise a
 * marriage or a rename breaks the link. The ID suffix is the author's own
 * convention (`A_Marie_2_1_Mirek`); a household effect names both members
 * outright, and the second one is the partner this answer is about.
 */
export const resolveReferencedCharacter = (
  option: ParsedAnswerOption,
  characterIds: Set<string>,
): string | undefined => {
  for (const effect of option.effects) {
    const partner = effect.args[1]
    if (partner !== undefined && characterIds.has(partner)) return partner
  }

  const suffix = option.externalId.split('_').pop()
  if (suffix && characterIds.has(suffix)) return suffix

  return undefined
}
