/**
 * Bad input makes the engine fail loudly instead of guessing. These problems
 * belong to import validation and answer entry; reaching the engine with one is
 * a bug upstream, and silently repairing it would hide that bug.
 */

export type EngineProblemCode =
  | 'duplicitni_id'
  | 'neznamy_odkaz'
  | 'nesouhlasi_kapitola'
  | 'nekonzistentni_stav'
  | 'chybi_odpoved'
  | 'neplatna_odpoved'
  | 'neplatny_hod'
  | 'neplatny_vyraz'
  | 'neznamy_identifikator'
  | 'random_v_otazce'
  | 'blok_bez_vysledku'

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
