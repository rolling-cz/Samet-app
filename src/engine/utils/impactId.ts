/**
 * `S_Marie_Regime` and `R_MarieMirek_Wealth_private` taken apart (§4.2).
 *
 * The owner carries no `_`, so the first one after the prefix splits the ID;
 * the key may contain more (`Wealth_2`). Mirrors the import's reading of the
 * impact column — the engine must not read an ID differently from the import.
 */
import {
  ID_SEPARATOR,
  PRIVATE_SUFFIX,
  RESOURCE_PREFIX,
  SCALE_PREFIX,
} from '../constants/expressionLanguage'

export interface ImpactIdParts {
  kind: 'skala' | 'zdroj'
  owner: string
  key: string
  /** `_private` was written; only meaningful on a resource (§4.4). */
  forcedPrivate: boolean
}

export const splitImpactId = (id: string): ImpactIdParts | undefined => {
  const prefix = id.slice(0, SCALE_PREFIX.length)
  if (prefix !== SCALE_PREFIX && prefix !== RESOURCE_PREFIX) return undefined

  const rest = id.slice(prefix.length)
  const separator = rest.indexOf(ID_SEPARATOR)
  if (separator <= 0 || separator === rest.length - 1) return undefined

  const owner = rest.slice(0, separator)
  const written = rest.slice(separator + 1)
  const kind = prefix === SCALE_PREFIX ? 'skala' : 'zdroj'
  const forcedPrivate = kind === 'zdroj' && written.endsWith(PRIVATE_SUFFIX)
  const key = forcedPrivate ? written.slice(0, -PRIVATE_SUFFIX.length) : written
  if (key === '') return undefined

  return { kind, owner, key, forcedPrivate }
}

export const scaleExternalId = (characterId: string, key: string): string =>
  `${SCALE_PREFIX}${characterId}${ID_SEPARATOR}${key}`

export const resourceExternalId = (owner: string, key: string): string =>
  `${RESOURCE_PREFIX}${owner}${ID_SEPARATOR}${key}`
