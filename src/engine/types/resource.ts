/** Resource definitions (§4.1, §4.4) — one per pair of owner × resource. */
import type { CharacterId, HouseholdId, ResourceKey } from './ids'

/**
 * Who a `Resources` row belongs to. A household owner is the joint account's
 * opening balance, which only a household from the `Household` column may have
 * (§4.2).
 */
export type ResourceOwner =
  | { kind: 'postava'; characterId: CharacterId }
  | { kind: 'domacnost'; householdId: HouseholdId }

/**
 * No `Min` / `Max`: a resource is unbounded and never clamped (§4.1).
 *
 * `scope` describes the resource, not the pair: `household` means it also has a
 * joint account and an unsuffixed impact is routed by marital status, `private`
 * means it always stays personal (§4.4).
 */
export interface ResourceDefinition {
  /** `R_Marie_Wealth` or `R_MarieMirek_Wealth`. */
  externalId: string
  owner: ResourceOwner
  key: ResourceKey
  label: string
  scope: 'private' | 'household'
  /** Starting value for chapter 1; later chapters start from the snapshot. */
  defaultValue: number
}
