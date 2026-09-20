/**
 * Phase 1, collecting answers. There are no default answers (§6.3): a question
 * that was asked and has no answer stops the computation, and every problem is
 * listed at once.
 *
 * A question counts as asked when its variant is among the ones stored with the
 * incoming state (§4.5). That holds for the earlier chapters as well: the state
 * keeps the whole run's selection, so their answers must all be passed in.
 */
import type { Catalog } from '../catalog/buildCatalog'
import { failIfAny, type EngineProblem } from '../errors/engineInputError'
import type { AnswerOptionId, ChapterNumber, QuestionId } from '../types/ids'
import type { AnswerInput } from '../types/input'
import type { QuestionDefinition } from '../types/question'
import { compareIds } from '../utils/compareIds'

/** Answers by question, plus every option anyone chose (poll votes included). */
export interface AnswerLookup {
  byQuestion: Map<QuestionId, AnswerInput>
  chosen: Set<AnswerOptionId>
}

export interface AnswerIndex extends AnswerLookup {
  /** Questions up to the computed chapter that were actually put to the org. */
  asked: Set<QuestionId>
}

type Report = (subject: string, detail: string) => void

/** Question types where the answer is a number, not a choice (§6.7). */
const DIRECT_TYPES: readonly QuestionDefinition['type'][] = Object.freeze(['scale_direct', 'resource_direct'])

/** Question types that take exactly one option. */
const SINGLE_CHOICE_TYPES: readonly QuestionDefinition['type'][] = Object.freeze(['bool', 'single', 'poll-answer'])

const checkOptions = (question: QuestionDefinition, answer: AnswerInput, catalog: Catalog, report: Report): void => {
  // A vote picks one of the poll's options, not the vote's own (it has none).
  const owner = question.type === 'poll-answer' && question.pollId !== undefined
    ? catalog.questions.get(question.pollId) ?? question
    : question
  const known = new Set(owner.options.map((option) => option.id))

  for (const optionId of answer.selectedOptionIds) {
    if (!known.has(optionId)) report(question.id, `option ${optionId} does not belong to the question`)
  }
  if (new Set(answer.selectedOptionIds).size !== answer.selectedOptionIds.length) {
    report(question.id, 'an option is selected twice')
  }
  if (SINGLE_CHOICE_TYPES.includes(question.type) && answer.selectedOptionIds.length !== 1) {
    report(question.id, `${question.type} needs exactly one option, got ${answer.selectedOptionIds.length}`)
  }
  // "None of these" is an option the author writes; an empty selection is an
  // unanswered question, and there are no default answers (§6.1, §6.3).
  if (question.type === 'multi' && answer.selectedOptionIds.length === 0) {
    report(question.id, 'multi needs at least one option')
  }
  if (DIRECT_TYPES.includes(question.type)) {
    if (answer.selectedOptionIds.length !== 1) report(question.id, `${question.type} needs its one option selected`)
    if (answer.value !== undefined && !Number.isInteger(answer.value)) {
      report(question.id, `${question.type} needs a whole number, got ${answer.value}`)
    }
  }
  for (const values of Object.values(answer.inputs ?? {})) {
    for (const [key, value] of Object.entries(values)) {
      if (!Number.isInteger(value)) report(question.id, `input ${key} must be a whole number, got ${value}`)
    }
  }
}

export const indexAnswers = (
  answers: AnswerInput[],
  catalog: Catalog,
  chapter: ChapterNumber,
  asked: Set<QuestionId>,
): AnswerIndex => {
  const problems: EngineProblem[] = []
  const report: Report = (subject, detail) => problems.push({ code: 'invalid_answer', subject, detail })

  const byQuestion = new Map<QuestionId, AnswerInput>()
  const chosen = new Set<AnswerOptionId>()

  for (const answer of answers) {
    const question = catalog.questions.get(answer.questionId)
    if (!question) {
      report(answer.questionId, 'answer to an unknown question')
      continue
    }
    if (question.type === 'poll') {
      report(question.id, 'a poll is answered through poll-answer questions, not directly')
      continue
    }
    if (question.chapter > chapter) {
      report(question.id, `answer to chapter ${question.chapter} while computing chapter ${chapter}`)
      continue
    }
    if (!asked.has(question.id)) {
      report(question.id, 'answer to a question whose variant was not selected — it was never asked')
      continue
    }
    if (byQuestion.has(question.id)) {
      report(question.id, 'answered twice')
      continue
    }

    checkOptions(question, answer, catalog, report)
    byQuestion.set(question.id, answer)
    for (const optionId of answer.selectedOptionIds) chosen.add(optionId)
  }

  const unanswered = [...asked].filter((questionId) => !byQuestion.has(questionId)).sort(compareIds)
  for (const questionId of unanswered) {
    const question = catalog.questions.get(questionId)
    problems.push({
      code: 'missing_answer',
      subject: questionId,
      detail: `${question?.characterId ?? '?'} has not answered`,
    })
  }

  failIfAny(problems)

  return { byQuestion, chosen, asked }
}
