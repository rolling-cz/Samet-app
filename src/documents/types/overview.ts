/**
 * The Přehled tab (§6.4): every owner's state and chosen variants for the
 * chapter whose documents the Dokumenty tab shows. Workbook IDs throughout.
 */
import type { ChapterNumber } from '@/engine'
import type { DocumentOwner } from './document'

export interface OverviewScale {
  key: string
  label: string
  /** Bounds of this character's pair, never a global 1–10 (§4.1). */
  min: number
  max: number
  value: number
}

export interface OverviewResource {
  key: string
  label: string
  value: number
}

export interface OverviewHousehold {
  householdId: string
  partnerIds: string[]
  /** `Mirek Pokorný` — who the joint account is shared with (§4.4). */
  partnerLabels: string[]
  resources: OverviewResource[]
}

export interface OverviewVariant {
  blockId: string
  /** Absent while the block waits for a roll (§7.4) — the document then has a problem. */
  variationId?: string
}

export interface OverviewEntry {
  owner: DocumentOwner
  ownerLabel: string
  /** Empty for a group: it has no scales or resources (§4.6). */
  scales: OverviewScale[]
  /** Personal accounts, which a marriage never dissolves (§4.4). */
  resources: OverviewResource[]
  household?: OverviewHousehold
  variants: OverviewVariant[]
}

export interface OutputOverview {
  chapter: ChapterNumber
  characters: OverviewEntry[]
  groups: OverviewEntry[]
}
