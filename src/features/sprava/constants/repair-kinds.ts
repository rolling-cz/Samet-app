/** Quiet repairs counted during parsing, in the order the report lists them. */
export const COUNTED_REPAIR_KINDS = Object.freeze([
  'filledDownCells',
  'trimmedCells',
  'skippedEmptyRows',
  'resolvedCharacterNames',
  'derivedQuestionIds',
  'derivedAnswerIds',
  'addedBoolAnswers',
  'semicolonSeparators',
] as const)

export type CountedRepairKind = (typeof COUNTED_REPAIR_KINDS)[number]
