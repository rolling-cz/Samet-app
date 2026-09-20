/** One action of a rule or of an answer option (§7.1). */
import type { BandId, BlockId, CharacterId, FlagId, ScaleId } from './ids'

export type Effect =
  | { kind: 'zmena_skaly'; characterId?: CharacterId; scaleId: ScaleId; delta: number; weight: number; usesDiceValue?: boolean }
  | { kind: 'nastaveni_skaly'; characterId?: CharacterId; scaleId: ScaleId; value: number }
  | { kind: 'pasmo'; characterId?: CharacterId; scaleId: ScaleId; bandId: BandId }
  | { kind: 'priznak'; characterId?: CharacterId; flagId: FlagId; value: boolean }
  | { kind: 'blok'; characterId?: CharacterId; blockId: BlockId }
  | { kind: 'tag'; characterId?: CharacterId; code: string; note?: string }
  /**
   * `HOUSEHOLD_CREATE(A, B)` / `HOUSEHOLD_DELETE(A, B)` (§4.4). Both members
   * are named outright, and the household's ID follows from them — so an
   * effect can name a household before it exists.
   *
   * Group membership and leadership are deliberately absent: they are not
   * state (§4.6).
   */
  | { kind: 'domacnost_vznik'; characterId: CharacterId; relatedCharacterId: CharacterId }
  | { kind: 'domacnost_zanik'; characterId: CharacterId; relatedCharacterId: CharacterId }
