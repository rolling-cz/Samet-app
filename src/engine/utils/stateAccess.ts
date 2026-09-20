/** Reading and writing a working state, whoever owns the value (§4.4). */
import { fail } from '../errors/engineInputError'
import type { ResourceAccount } from '../types/account'
import type { CharacterId, HouseholdId, ResourceKey } from '../types/ids'
import type { CharacterState, HouseholdState, RunState } from '../types/state'

export const characterStateOf = (state: RunState, characterId: CharacterId): CharacterState =>
  state.characters[characterId] ??
  fail('nekonzistentni_stav', characterId, 'character is missing from the state')

export const householdStateOf = (state: RunState, householdId: HouseholdId): HouseholdState =>
  state.households[householdId] ??
  fail('nekonzistentni_stav', householdId, 'household is missing from the state')

/**
 * A joint account that does not exist reads as zero: a household starts with
 * nothing on it and leaves nothing behind (§4.4), so before and after its
 * lifetime the balance genuinely is 0.
 */
export const readResource = (state: RunState, account: ResourceAccount, key: ResourceKey): number => {
  if (account.kind === 'osobni') {
    return (
      characterStateOf(state, account.characterId).resources[key] ??
      fail('nekonzistentni_stav', `${account.characterId}/${key}`, 'the character has no such resource')
    )
  }

  return state.households[account.householdId]?.resources[key] ?? 0
}

export const writeResource = (
  state: RunState,
  account: ResourceAccount,
  key: ResourceKey,
  value: number,
): void => {
  if (account.kind === 'osobni') {
    characterStateOf(state, account.characterId).resources[key] = value

    return
  }

  householdStateOf(state, account.householdId).resources[key] = value
}
