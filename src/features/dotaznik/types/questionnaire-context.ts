/** What every save of one questionnaire screen shares. */
export interface QuestionnaireContext {
  runId: string
  chapter: number
  characterId: string
  /**
   * The reason for editing a released chapter: asked once per character, then
   * reused. Resolves to `undefined` when the org backs out. Absent elsewhere.
   */
  requestReason?: () => Promise<string | undefined>
  onUnsavedChange: (questionId: string, isUnsaved: boolean) => void
}
