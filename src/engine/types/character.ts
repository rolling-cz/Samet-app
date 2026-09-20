/** Character registry entry (§4.2). */
import type { CharacterId, ScaleId } from './ids'

export interface CharacterDefinition {
  id: CharacterId
  externalId: string
  firstName: string
  lastName: string
  birthYear?: number
  scaleIds: ScaleId[]
}
