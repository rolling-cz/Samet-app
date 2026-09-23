/**
 * Values the `{PROMENNA}` markers are filled with (§8.3).
 *
 * A name is never written into the text by hand — marriage changes a surname
 * and the wiring would fall apart (§8.4) — so `{JMENO}`, `{PRIJMENI}` and a
 * group's `{NAZEV}` come from the registry. `{S_Regime}` and `{R_Wealth}` print
 * the value the character enters the chapter with.
 *
 * Resources route exactly like they do in a condition (§4.4): plain `R_Wealth`
 * is the account the money flows into, `R_Wealth_private` is always the
 * personal one. The document has to agree with the rule that picked its text.
 */
import {
  characterResourceReference,
  readResource,
  routeResource,
  type EngineConfig,
  type RunState,
} from '@/engine'
import type { DocumentOwner } from '../types/document'

/** `{R_Wealth_private}` — the escape hatch wins over routing (§4.4). */
const PRIVATE_SUFFIX = '_private'

const SCALE_PREFIX = 'S_'
const RESOURCE_PREFIX = 'R_'

export const variablesFor = (
  config: EngineConfig,
  state: RunState,
  owner: DocumentOwner,
): Record<string, string> => {
  if (owner.kind === 'group') {
    const group = config.groups.find((candidate) => candidate.id === owner.id)

    // A group has no scales or resources of its own; `{S_…}` in its template is
    // left unresolved on purpose and reported.
    return group === undefined ? {} : { NAZEV: group.name }
  }

  const character = config.characters.find((candidate) => candidate.id === owner.id)
  if (character === undefined) return {}

  const variables: Record<string, string> = {
    JMENO: character.firstName,
    PRIJMENI: character.lastName,
  }

  const characterState = state.characters[owner.id]
  if (characterState === undefined) return variables

  for (const scale of config.scales) {
    if (scale.characterId !== owner.id) continue
    const value = characterState.scales[scale.key]
    if (value !== undefined) variables[`${SCALE_PREFIX}${scale.key}`] = String(value)
  }

  for (const resource of config.resources) {
    if (resource.owner.kind !== 'character' || resource.owner.characterId !== owner.id) continue

    for (const forcedPrivate of [false, true]) {
      const name = `${RESOURCE_PREFIX}${resource.key}${forcedPrivate ? PRIVATE_SUFFIX : ''}`
      const reference = characterResourceReference(owner.id, resource.key, resource.scope, forcedPrivate)
      variables[name] = String(readResource(state, routeResource(state, reference).account, resource.key))
    }
  }

  return variables
}
