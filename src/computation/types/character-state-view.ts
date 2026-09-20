/** What the questionnaire shows under a character: their state before the chapter (§6.4). Workbook IDs throughout. */
export interface ScaleView {
  /** `S_Marie_Regime`. */
  externalId: string
  key: string
  label: string
  /** Bounds of this character's pair, never a global 1–10 (§4.1). */
  min: number
  max: number
  value: number
}

export interface ResourceView {
  key: string
  label: string
  value: number
}

export interface HouseholdView {
  householdId: string
  /** The other member — who the joint account is shared with (§4.4). */
  partnerIds: string[]
  resources: ResourceView[]
}

export interface CharacterStateView {
  characterId: string
  scales: ScaleView[]
  /** Personal accounts, which a marriage never dissolves. */
  resources: ResourceView[]
  /** Absent while the character is single. */
  household?: HouseholdView
}
