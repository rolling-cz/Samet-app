/**
 * Everything the computed chapter's answers set in motion, in sheet order:
 * questions as the config lists them, options within a question, impacts within
 * an option. Never in the order the answers arrived — that would make the
 * result depend on data entry (§7.3).
 *
 * A poll contributes its winning option once, not once per voter (§6.6).
 */
import type { EvaluationContext } from '../evaluationContext'
import type { HouseholdEffect } from '../types/effect'
import type { ImpactDefinition } from '../types/impact'
import type { AnswerInput } from '../types/input'
import type { AnswerOptionDefinition, QuestionDefinition } from '../types/question'
import type { EffectSource } from '../types/source'
import { joinKey } from '../utils/keys'

export interface ImpactInstance {
  impact: ImpactDefinition
  source: EffectSource
  /** `{input}` values the org typed for this option. */
  inputs: Record<string, number>
  /** The number behind `=VALUE`. */
  answerValue?: number
  /** Set on impacts derived from a household effect; matches `EffectInstance.key`. */
  effectKey?: string
}

export interface EffectInstance {
  effect: HouseholdEffect
  source: EffectSource
  key: string
}

export interface CollectedEffects {
  impacts: ImpactInstance[]
  effects: EffectInstance[]
}

const effectKeyOf = (optionId: string, raw: string): string => joinKey(optionId, raw)

const collectOption = (
  question: QuestionDefinition,
  option: AnswerOptionDefinition,
  answer: AnswerInput | undefined,
  kind: EffectSource['kind'],
  collected: CollectedEffects,
): void => {
  const inputs = answer?.inputs?.[option.id] ?? {}
  const base: EffectSource = {
    kind,
    questionId: question.id,
    optionId: option.id,
    optionLabel: option.label,
    filledByOrg: answer?.filledByOrg ?? true,
  }
  if (question.characterId !== undefined) base.characterId = question.characterId

  const effectsByRaw = new Map<string, HouseholdEffect>()
  for (const effect of option.effects) {
    effectsByRaw.set(effect.raw, effect)
    collected.effects.push({ effect, source: base, key: effectKeyOf(option.id, effect.raw) })
  }

  for (const impact of option.impacts) {
    const instance: ImpactInstance = { impact, source: base, inputs }
    if (answer?.value !== undefined) instance.answerValue = answer.value

    const effect = impact.derivedFrom === undefined ? undefined : effectsByRaw.get(impact.derivedFrom)
    if (effect) {
      instance.effectKey = effectKeyOf(option.id, effect.raw)
      instance.source = { ...base, derivedFrom: { raw: effect.raw, members: effect.members, inputs } }
    }
    collected.impacts.push(instance)
  }
}

export const collectEffects = (context: EvaluationContext): CollectedEffects => {
  const collected: CollectedEffects = { impacts: [], effects: [] }

  for (const question of context.catalog.config.questions) {
    if (question.chapter !== context.chapter) continue

    if (question.type === 'poll') {
      const winnerId = context.polls.winners.get(question.id)
      const winner = question.options.find((option) => option.id === winnerId)
      if (winner) collectOption(question, winner, undefined, 'anketa', collected)
      continue
    }
    // A vote carries nothing of its own; the poll's winner does (§6.6).
    if (question.type === 'poll-answer') continue

    const answer = context.answers.byQuestion.get(question.id)
    if (!answer) continue
    for (const option of question.options) {
      if (context.answers.chosen.has(option.id) && answer.selectedOptionIds.includes(option.id)) {
        collectOption(question, option, answer, 'odpoved', collected)
      }
    }
  }

  return collected
}
