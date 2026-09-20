/** Internal lookup keys; never part of the output. */
import { KEY_SEPARATOR } from '../constants/keySeparator'
import type { RollOwner } from '../types/input'
import type { VariationId } from '../types/ids'

export const joinKey = (...parts: (string | number)[]): string => parts.join(KEY_SEPARATOR)

export const rollKey = (owner: RollOwner, variationId: VariationId, occurrence: number): string =>
  joinKey(owner.ownerKind, owner.ownerId, variationId, occurrence)
