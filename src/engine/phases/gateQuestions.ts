/**
 * Which questions of a chapter are asked (§4.2). A question without a condition
 * always is; otherwise its expression is read over the state the chapter
 * starts from — the finished state of the chapter before it — together with
 * the answers given so far. `RANDOM` has no place here (§7.4).
 */
import type { Catalog } from '../catalog/buildCatalog'
import { fail } from '../errors/engineInputError'
import { compileCondition } from '../expression/compileCondition'
import { environmentFor, type EnvironmentScope } from '../expression/conditionEnvironment'
import { evaluateCondition } from '../expression/evaluateCondition'
import type { QuestionGate } from '../types/result'
import type { QuestionGateTrace } from '../types/trace'

export interface QuestionGates {
  gates: QuestionGate[]
  traces: QuestionGateTrace[]
}

export const gateQuestions = (catalog: Catalog, scope: EnvironmentScope, chapter: number): QuestionGates => {
  const gates: QuestionGate[] = []
  const traces: QuestionGateTrace[] = []

  for (const question of catalog.config.questions) {
    // A poll is nobody's question and is never "asked" on its own (§6.6).
    if (question.chapter !== chapter || question.type === 'poll') continue

    const gate: QuestionGate = { questionId: question.id, asked: true }
    if (question.characterId !== undefined) gate.characterId = question.characterId

    if (question.condition !== undefined) {
      const condition = compileCondition(question.condition, { catalog, ownerId: question.id, allowRandom: false })
      const outcome = evaluateCondition(condition, environmentFor(scope))
      if (outcome.result === 'unknown') fail('random_in_question', question.id, 'a question condition cannot be undecided')
      gate.asked = outcome.result === 'holds'
      traces.push({ phase: 'questions', kind: 'question', questionId: question.id, ...(gate.characterId !== undefined ? { characterId: gate.characterId } : {}), asked: gate.asked, readings: outcome.readings })
    } else {
      traces.push({ phase: 'questions', kind: 'question', questionId: question.id, ...(gate.characterId !== undefined ? { characterId: gate.characterId } : {}), asked: true, readings: [] })
    }

    gates.push(gate)
  }

  return { gates, traces }
}
