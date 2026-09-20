/**
 * What the engine refuses to decide (§7.3). Every conflict blocks confirming
 * the computation; the org resolves it.
 *
 * A tie in a poll is not here — the earlier row of the poll definition wins, so
 * the result is fully determined (§6.6). Neither is a choice between block
 * variants, which priority or row order settles completely (§8.2).
 */
import type { CharacterId, HouseholdId } from './ids'
import type { EffectSource } from './source'

export type Conflict =
  | {
      /**
       * A value the org left open: an `{input}` field with no number, or an
       * absolute setting with no answer. Nothing is rounded or guessed (§4.4).
       */
      kind: 'unresolved_value'
      source: EffectSource
      /** The impact that could not be worked out, as the author wrote it. */
      raw: string
      /** Placeholders still waiting for a number. */
      missingInputKeys: string[]
    }
  | {
      /** `HOUSEHOLD_CREATE` for a character who already lives in one (§4.4). */
      kind: 'already_in_household'
      source: EffectSource
      characterId: CharacterId
      /** The household they are in now. */
      currentHouseholdId: HouseholdId
      /** The household the effect wanted to create. */
      householdId: HouseholdId
    }
  | {
      /** `HOUSEHOLD_DISSOLVE` of a household that does not exist (§4.4). */
      kind: 'household_missing'
      source: EffectSource
      householdId: HouseholdId
    }
  | {
      /**
       * The inputs of a `HOUSEHOLD_DISSOLVE` do not add up to the joint balance.
       * After a dissolution no balance may remain (§4.4), and the engine never
       * splits the remainder itself.
       */
      kind: 'payout_mismatch'
      source: EffectSource
      householdId: HouseholdId
      resourceKey: string
      balance: number
      inputsTotal: number
    }
