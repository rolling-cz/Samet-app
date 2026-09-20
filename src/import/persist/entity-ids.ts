/** Source ID → database ID lookups built while writing a config. */
export type IdMap<K extends string | number = string> = Map<K, string>

export interface EntityIds {
  characterIds: IdMap
  groupIds: IdMap
  /** Scale key (`Regime`) → scale definition row. */
  scaleIds: IdMap
  /** Resource key (`Wealth`) → resource definition row. */
  resourceIds: IdMap
  chapterIds: IdMap<number>
  blockIds: IdMap
  /** `Variation ID` → database ID, so a question's `Condition` can point at its variant (§4.5). */
  variationIds: IdMap
  /** Question source ID → database ID, so a `poll-answer` can point at its poll. */
  questionIds: IdMap
}
