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
import { indexAnswers } from './phases/indexAnswers'
import { indexRolls } from './phases/indexRolls'
import { resolvePolls } from './phases/resolvePolls'
import { selectVariants } from './phases/selectVariants'
import { validateState } from './phases/validateState'
import type { EngineConfig } from './types/config'
import { CHAPTER_NUMBERS, NEXT_CHAPTER_OFFSET, type ChapterNumber } from './types/ids'
import type { EvaluationInputs } from './types/input'
import type { EvaluateResult, VariantSelection } from './types/result'
import type { RunState, SelectedVariants } from './types/state'
import { compareIds } from './utils/compareIds'
import { normalizeState } from './utils/normalizeState'

const chapterAfter = (chapter: ChapterNumber): ChapterNumber | undefined =>
  CHAPTER_NUMBERS.find((candidate) => candidate === chapter + NEXT_CHAPTER_OFFSET)

/** Undecided blocks stay out: nothing was selected for them yet (§7.4). */
const selectedVariantsOf = (variants: VariantSelection[]): SelectedVariants => {
  const selected: SelectedVariants = { characters: {}, groups: {} }

  for (const variant of variants) {
    if (variant.variationId === null) continue
    const owners = variant.characterId !== undefined ? selected.characters : selected.groups
    const ownerId = variant.characterId ?? variant.groupId
    if (ownerId === undefined) continue

    const variationIds = owners[ownerId] ?? []
    variationIds.push(variant.variationId)
    owners[ownerId] = variationIds
  }

  return selected
}

export const evaluate = (state: RunState, inputs: EvaluationInputs, config: EngineConfig): EvaluateResult => {
  const catalog = buildCatalog(config)
  validateState(state, catalog, inputs.chapter)

  // Which of this chapter's questions were asked is a lookup in the variants
  // the previous computation selected and stored with the state (§4.5).
  const asked = gateQuestions(catalog, state.selectedVariants, inputs.chapter)
  const answers = indexAnswers(inputs.answers, catalog, inputs.chapter, new Set(asked.gates.filter((gate) => gate.asked).map((gate) => gate.questionId)))
  const polls = resolvePolls(catalog, answers, inputs.chapter)

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
  const selectedVariants = selectedVariantsOf(variants)
  const nextChapter = chapterAfter(inputs.chapter)
  const questions = nextChapter === undefined ? { gates: [], traces: [] } : gateQuestions(catalog, selectedVariants, nextChapter)
  context.trace.push(...questions.traces)

  return {
    state: normalizeState({ ...context.state, completedChapter: inputs.chapter, selectedVariants }),
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
