import type { CompletionStatus } from '@/computation'
import { foldText } from '@/utils/fold-text'
import type { CharacterListItem } from '../types/character-list-item'

/**
 * Search by name, blind to diacritics and case („vera" finds Věra), and the
 * „jen nevyplněné" filter: empty and in progress (§6.4). The panel's order stays.
 */
export const filterCharacters = (
  characters: readonly CharacterListItem[],
  query: string,
  onlyUnfilled: boolean,
  statusOf: (characterId: string) => CompletionStatus | undefined,
): CharacterListItem[] => {
  const needle = foldText(query)

  return characters.filter((character) => {
    if (onlyUnfilled && statusOf(character.externalId) === 'done') return false
    if (needle === '') return true

    return foldText(`${character.firstName} ${character.lastName}`).includes(needle)
  })
}
