/**
 * `evaluate(state, inputs, config) → { state, trace, conflicts, … }` — the
 * rules engine (§7). Pure: no database, no network, no clock, no randomness.
 * The same input gives byte-identical output, and the input is never modified.
 */
import { buildCatalog } from './catalog/buildCatalog'
import type { EvaluationContext } from './evaluationContext'
import type { EnvironmentScope } from './expression/conditionEnvironment'
import { applyStructural, dropDissolvedHouseholds } from './phases/applyStructural'
import { applyValues } from './phases/applyValues'
import { collectEffects } from './phases/collectEffects'
import { gateQuestions } from './phases/gateQuestions'
import { indexAnswers, preliminaryLookup } from './phases/indexAnswers'
import { indexRolls } from './phases/indexRolls'
import { resolvePolls } from './phases/resolvePolls'
import { selectVariants } from './phases/selectVariants'
import { validateState } from './phases/validateState'
import type { EngineConfig } from './types/config'
import { CHAPTER_NUMBERS, NEXT_CHAPTER_OFFSET, type ChapterNumber } from './types/ids'
import type { EvaluationInputs } from './types/input'
import type { EvaluateResult } from './types/result'
import type { RunState } from './types/state'
import { compareIds } from './utils/compareIds'
import { normalizeState } from './utils/normalizeState'

const chapterAfter = (chapter: ChapterNumber): ChapterNumber | undefined =>
  CHAPTER_NUMBERS.find((candidate) => candidate === chapter + NEXT_CHAPTER_OFFSET)

export const evaluate = (state: RunState, inputs: EvaluationInputs, config: EngineConfig): EvaluateResult => {
  const catalog = buildCatalog(config)
  validateState(state, catalog, inputs.chapter)

  // Which of this chapter's questions were asked follows from the incoming
  // state and the earlier answers — the same reading the previous computation
  // made when it printed the questionnaire (§4.2).
  const lookup = preliminaryLookup(inputs.answers, catalog)
  const polls = resolvePolls(catalog, lookup, inputs.chapter)
  const asked = gateQuestions(
    catalog,
    { catalog, state, answers: lookup, pollWinners: polls.winners, answeredUpTo: inputs.chapter - 1 },
    inputs.chapter,
  )
  const answers = indexAnswers(inputs.answers, catalog, inputs.chapter, new Set(asked.gates.filter((gate) => gate.asked).map((gate) => gate.questionId)))

  const context: EvaluationContext = {
    chapter: inputs.chapter,
    catalog,
    answers,
    polls,
    rolls: indexRolls(inputs.rolls),
    state: structuredClone(state),
    trace: [...polls.traces],
    conflicts: [],
    missingRolls: new Map(),
    dissolvedHouseholdIds: new Set(),
    rejectedEffectKeys: new Set(),
  }

  const collected = collectEffects(context)
  // The structural phase completes before any value: routing needs the
  // households as they are after every marriage and divorce (§7.3).
  applyStructural(context, collected)
  applyValues(context, collected.impacts)
  dropDissolvedHouseholds(context)

  // Documents and questionnaire for the next chapter, over the finished state (§8.2).
  const scope: EnvironmentScope = {
    catalog,
    state: context.state,
    answers,
    pollWinners: polls.winners,
    answeredUpTo: inputs.chapter,
  }
  const variants = selectVariants(context, scope)
  const nextChapter = chapterAfter(inputs.chapter)
  const questions = nextChapter === undefined ? { gates: [], traces: [] } : gateQuestions(catalog, scope, nextChapter)
  context.trace.push(...questions.traces)

  return {
    state: normalizeState({ ...context.state, completedChapter: inputs.chapter }),
    trace: context.trace,
    conflicts: context.conflicts,
    missingRolls: [...context.missingRolls.entries()]
      .sort(([a], [b]) => compareIds(a, b))
      .map(([, request]) => request),
    nextChapter,
    variants,
    questions: questions.gates,
  }
}
