/**
 * The computation core: the layer between the database and the engine.
 *
 *   load(runId, chapter) → evaluate(state, answers, config) → save(result)
 *
 * The engine knows nothing of the database and the database nothing of the
 * engine; the conversions between them are pure functions in `convert/`, and
 * only the thin shell in `services/` and `read/` touches the database — always
 * through `forRun(runId)`.
 */
export { runComputation, type ComputationRequest } from './services/run-computation'
export {
  confirmComputation,
  type ConfirmationOutcome,
  type ConfirmationRequest,
} from './services/confirm-computation'
export { loadAskedQuestions } from './read/load-asked-questions'
export { loadCharacterState, type CharacterStateBefore } from './read/load-character-state'
export { loadChapterAvailability } from './read/load-chapter-availability'
export { loadComputationBlockers, type ComputationBlockers } from './read/load-computation-blockers'
export { loadQuestionnaire } from './read/load-questionnaire'
export { loadChapterCompletion } from './read/load-chapter-completion'
export { loadChapterStaleness } from './read/load-chapter-staleness'
export { completionSummary } from './convert/completion-summary'
export { ANSWER_AUDIT_ACTIONS, ANSWER_AUDIT_ENTITY } from './constants/audit-actions'
export type { AskedQuestion, AskedQuestions } from './types/asked-question'
export type { ChapterAvailability } from './types/chapter-availability'
export type { CharacterStateView, HouseholdView, ResourceView, ScaleView } from './types/character-state-view'
export type { ComputationOutcome } from './types/computation-outcome'
export type { MissingAnswer } from './types/missing-answer'
export type {
  AnswerState,
  ChapterCompletion,
  CharacterCompletion,
  CompletionStatus,
  CompletionSummary,
} from './types/completion'
export type { ChapterStaleness } from './types/chapter-staleness'
export type {
  AnswerView,
  AskedQuestionType,
  DirectAccountView,
  DirectTargetView,
  HouseholdEffectView,
  InputFieldView,
  OptionView,
  PersonView,
  Questionnaire,
  QuestionnaireView,
  QuestionView,
} from './types/questionnaire-view'
