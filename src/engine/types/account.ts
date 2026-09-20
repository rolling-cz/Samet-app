/** Where a resource value actually lives, once routing has decided (§4.4). */
import type { CharacterId, HouseholdId } from './ids'

export type ResourceAccount =
  | { kind: 'osobni'; characterId: CharacterId }
  | { kind: 'domacnost'; householdId: HouseholdId; memberIds: CharacterId[] }

/**
 * Why the impact landed where it did. Routing is the biggest risk to the "no
 * black box" principle (§2): `R_Marie_Wealth+3` does not show the account, so
 * the trace has to.
 */
export type RoutingReason =
  /** `R_Marie_Wealth` and Marie is married — the joint account. */
  | 'spolecny_manzelstvi'
  /** `R_Marie_Wealth` and Marie is single. */
  | 'osobni_svobodna'
  /** `R_Marie_Wealth_private` — the suffix wins over routing. */
  | 'vynuceny_osobni'
  /** The resource is `private`, so it never has a joint account. */
  | 'osobni_zdroj'
  /** `R_MarieMirek_Wealth` — the household is named outright. */
  | 'primo_domacnost'
