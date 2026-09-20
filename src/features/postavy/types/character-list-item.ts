import type { characters } from '@/db/schema'

/**
 * A row of the left panel (§6.4): name plus, later, the completion indicator.
 * No group — membership is not state (§4.6).
 */
export type CharacterListItem = Pick<
  typeof characters.$inferSelect,
  'id' | 'externalId' | 'firstName' | 'lastName'
>
