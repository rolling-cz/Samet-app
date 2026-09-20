import { eq } from 'drizzle-orm'
import { forRun } from '@/db'
import { characters } from '@/db/schema'
import type { CharacterListItem } from '../types/character-list-item'

/** By the registry ID from the address (`Marie`), not the database key. */
export const findCharacter = async (runId: string, externalId: string): Promise<CharacterListItem | undefined> => {
  const [character] = await forRun(runId).selectColumns(
    characters,
    {
      id: characters.id,
      externalId: characters.externalId,
      firstName: characters.firstName,
      lastName: characters.lastName,
    },
    eq(characters.externalId, externalId),
  )

  return character
}
