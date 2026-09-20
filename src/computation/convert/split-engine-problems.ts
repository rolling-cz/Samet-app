import type { EngineConfig, EngineProblem } from '@/engine'
import type { MissingAnswer } from '../types/missing-answer'

export interface SplitProblems {
  missingAnswers: MissingAnswer[]
  /** Anything else the engine refused; a bug upstream, shown as it is. */
  otherProblems: EngineProblem[]
}

/**
 * The engine fills in nothing (§6.3): a missing answer stops it. For the org
 * that is not a failure but a to-do list, so it is told apart from the rest.
 */
export const splitEngineProblems = (problems: readonly EngineProblem[], config: EngineConfig): SplitProblems => {
  const questions = new Map(config.questions.map((question) => [question.id, question]))
  const split: SplitProblems = { missingAnswers: [], otherProblems: [] }

  for (const problem of problems) {
    if (problem.code !== 'missing_answer') {
      split.otherProblems.push(problem)
      continue
    }

    const question = questions.get(problem.subject)
    const missing: MissingAnswer = { questionId: problem.subject }
    if (question?.characterId !== undefined) missing.characterId = question.characterId
    if (question !== undefined) missing.chapter = question.chapter
    split.missingAnswers.push(missing)
  }

  return split
}
