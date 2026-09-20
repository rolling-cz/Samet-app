/** A question that was asked and nobody answered — what keeps a computation from running (§6.3). */
export interface MissingAnswer {
  /** Workbook IDs, as the org knows them. */
  questionId: string
  /** Absent only if the config does not know the question at all. */
  characterId?: string
  chapter?: number
}
