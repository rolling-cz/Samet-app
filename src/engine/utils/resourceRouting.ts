/**
 * Which account a resource reference lands on (§4.4), read against the current
 * state — so a marriage from the structural phase already counts (§7.3).
 */
import type { ResourceAccount, RoutingReason } from '../types/account'
import type { ResourceReference } from '../types/condition'
import type { CharacterId, ResourceKey } from '../types/ids'
import type { ResourceDefinition } from '../types/resource'
import type { RunState } from '../types/state'
import { characterStateOf } from './stateAccess'

export interface RoutedAccount {
  account: ResourceAccount
  reason: RoutingReason
}

/**
 * How `R_Marie_Wealth` on a character is read (§4.4). One place, because the
 * printed document has to route exactly like the condition that guarded it —
 * otherwise the text and the rule that chose it could disagree.
 */
export const characterResourceReference = (
  characterId: CharacterId,
  key: ResourceKey,
  scope: ResourceDefinition['scope'],
  forcedPrivate: boolean,
): ResourceReference => {
  if (forcedPrivate) return { kind: 'personal', characterId, reason: 'forced_private' }
  if (scope === 'private') return { kind: 'personal', characterId, reason: 'private_resource' }

  return { kind: 'routed', characterId }
}

export const routeResource = (state: RunState, reference: ResourceReference): RoutedAccount => {
  switch (reference.kind) {
    case 'personal':
      return { account: { kind: 'personal', characterId: reference.characterId }, reason: reference.reason }
    case 'household': {
      const memberIds = state.households[reference.householdId]?.memberIds ?? []

      return {
        account: { kind: 'household', householdId: reference.householdId, memberIds: [...memberIds] },
        reason: 'household_named',
      }
    }
    case 'routed': {
      const householdId = characterStateOf(state, reference.characterId).householdId
      if (householdId === undefined) {
        return { account: { kind: 'personal', characterId: reference.characterId }, reason: 'personal_single' }
      }
      const memberIds = state.households[householdId]?.memberIds ?? []

      return {
        account: { kind: 'household', householdId, memberIds: [...memberIds] },
        reason: 'joint_married',
      }
    }
  }
}
