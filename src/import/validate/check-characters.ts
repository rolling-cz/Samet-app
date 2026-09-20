import type { IssueCollector } from '../issue-collector'
import type { ParsedConfig } from '../types/parsed-config'
import { suggestClosest } from '../utils/suggest-closest'

export const checkCharacters = (config: ParsedConfig, issues: IssueCollector): void => {
  const characterIds = new Set(config.characters.map((character) => character.externalId))

  for (const character of config.characters) {
    if (character.firstName !== '') continue
    issues.warn(
      'chybejici_hodnota',
      character.location,
      `Postava \`${character.externalId}\` nemá jméno — v dokumentech se \`{JMENO}\` rozvine naprázdno.`,
    )
  }

  for (const group of config.groups) {
    for (const member of group.memberRefs) {
      if (characterIds.has(member)) continue
      issues.error(
        'neznama_postava',
        group.location,
        `Skupina \`${group.externalId}\` má mezi členy \`${member}\`, což není postava z listu \`Characters\`.`,
        { value: member, suggestion: suggestClosest(member, characterIds) },
      )
    }

    if (group.leaderRef === undefined) continue
    if (characterIds.has(group.leaderRef)) continue
    issues.error(
      'neznama_postava',
      group.location,
      `Skupina \`${group.externalId}\` má vedoucího \`${group.leaderRef}\`, což není postava z listu \`Characters\`.`,
      { value: group.leaderRef, suggestion: suggestClosest(group.leaderRef, characterIds) },
    )
  }
}
