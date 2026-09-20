import { forRun } from '@/db'
import { characters } from '@/db/schema'
import { APP_LOCALE } from '@/locales/app-locale'
import type { CharacterListItem } from '../types/character-list-item'

const collator = new Intl.Collator(APP_LOCALE)

/** Orgs call characters by first name (`Marie`), as the sheet IDs do. */
const byName = (a: CharacterListItem, b: CharacterListItem): number =>
  collator.compare(a.firstName, b.firstName) || collator.compare(a.lastName, b.lastName)

export const loadCharacterList = async (runId: string): Promise<CharacterListItem[]> => {
  const characterRows = await forRun(runId).selectColumns(characters, {
    id: characters.id,
    externalId: characters.externalId,
    firstName: characters.firstName,
    lastName: characters.lastName,
  })

  return [...characterRows].sort(byName)
}
