/**
 * Which account a resource reference lands on (§4.4), read against the current
 * state — so a marriage from the structural phase already counts (§7.3).
 */
import type { ResourceAccount, RoutingReason } from '../types/account'
import type { ResourceReference } from '../types/condition'
import type { RunState } from '../types/state'
import { characterStateOf } from './stateAccess'

export interface RoutedAccount {
  account: ResourceAccount
  reason: RoutingReason
}

export const routeResource = (state: RunState, reference: ResourceReference): RoutedAccount => {
  switch (reference.kind) {
    case 'osobni':
      return { account: { kind: 'osobni', characterId: reference.characterId }, reason: reference.reason }
    case 'domacnost': {
      const memberIds = state.households[reference.householdId]?.memberIds ?? []

      return {
        account: { kind: 'domacnost', householdId: reference.householdId, memberIds: [...memberIds] },
        reason: 'primo_domacnost',
      }
    }
    case 'smerovany': {
      const householdId = characterStateOf(state, reference.characterId).householdId
      if (householdId === undefined) {
        return { account: { kind: 'osobni', characterId: reference.characterId }, reason: 'osobni_svobodna' }
      }
      const memberIds = state.households[householdId]?.memberIds ?? []

      return {
        account: { kind: 'domacnost', householdId, memberIds: [...memberIds] },
        reason: 'spolecny_manzelstvi',
      }
    }
  }
}
