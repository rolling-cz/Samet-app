/** Where a resource value actually lives, once routing has decided (§4.4). */
import type { CharacterId, HouseholdId } from './ids'

export type ResourceAccount =
  | { kind: 'personal'; characterId: CharacterId }
  | { kind: 'household'; householdId: HouseholdId; memberIds: CharacterId[] }

/**
 * Why the impact landed where it did. Routing is the biggest risk to the "no
 * black box" principle (§2): `R_Marie_Wealth+3` does not show the account, so
 * the trace has to.
 */
export type RoutingReason =
  /** `R_Marie_Wealth` and Marie is married — the joint account. */
  | 'joint_married'
  /** `R_Marie_Wealth` and Marie is single. */
  | 'personal_single'
  /** `R_Marie_Wealth_private` — the suffix wins over routing. */
  | 'forced_private'
  /** The resource is `private`, so it never has a joint account. */
  | 'private_resource'
  /** `R_MarieMirek_Wealth` — the household is named outright. */
  | 'household_named'
