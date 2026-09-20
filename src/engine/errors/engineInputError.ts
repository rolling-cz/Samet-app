/**
 * Bad input makes the engine fail loudly instead of guessing. These problems
 * belong to import validation and answer entry; reaching the engine with one is
 * a bug upstream, and silently repairing it would hide that bug.
 */

export type EngineProblemCode =
  | 'duplicate_id'
  | 'unknown_reference'
  | 'chapter_mismatch'
  | 'inconsistent_state'
  | 'missing_answer'
  | 'invalid_answer'
  | 'invalid_roll'
  | 'invalid_expression'
  | 'unknown_identifier'
  | 'invalid_question_condition'
  | 'block_without_result'

export interface EngineProblem {
  code: EngineProblemCode
  /** The ID the problem is about. */
  subject: string
  /** For developers; the UI words problems from `code` and `subject`. */
  detail: string
}

export class EngineInputError extends Error {
  readonly problems: EngineProblem[]

  constructor(problems: EngineProblem[]) {
    super(problems.map((problem) => `${problem.code} ${problem.subject}: ${problem.detail}`).join('\n'))
    this.name = 'EngineInputError'
    this.problems = problems
  }
}

export const fail = (code: EngineProblemCode, subject: string, detail: string): never => {
  throw new EngineInputError([{ code, subject, detail }])
}

/** Collected problems are thrown together, so one run lists all of them. */
export const failIfAny = (problems: EngineProblem[]): void => {
  if (problems.length > 0) throw new EngineInputError(problems)
}
