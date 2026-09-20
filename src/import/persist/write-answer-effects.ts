/**
 * Layers 1 and 2 (§4.5) end up in the `effects` table, owned by the answer
 * option — the revised spec has no separate rule sheet, so this is the only
 * thing that produces effects.
 *
 * Effects have no source ID of their own, so an answer's effects are rewritten
 * as a set: they are derived data, fully reproducible from the sheet.
 */
import type { RunScope } from '@/db'
import { effectInputs, effects } from '@/db/schema'
import { ANSWER_EFFECT_KINDS } from '../constants/answer-effect-kinds'
import { inputKeys, literalAmount, type ScaleImpact } from '../scale-impact'
import type { ParsedConfig } from '../types/parsed-config'
import type { ParsedAnswerOption, ParsedQuestion } from '../types/parsed-question'
import type { EntityIds, IdMap } from './entity-ids'
import type { WrittenRows } from './written-rows'

type EffectRow = typeof effects.$inferInsert
type EffectPayload = Omit<EffectRow, 'runId' | 'externalId' | 'ordinal' | 'answerOptionId'>

/** An effect plus the `{input}` placeholders that supply its amount (§4.4). */
interface PlannedEffect {
  payload: EffectPayload
  inputs: { inputKey: string; sign: number }[]
}

export const writeAnswerEffects = async (
  scope: RunScope,
  config: ParsedConfig,
  written: WrittenRows,
  refs: EntityIds,
  optionIds: IdMap,
): Promise<void> => {
  for (const list of config.questions.values()) {
    for (const question of list) {
      for (const option of question.options) {
        const optionId = optionIds.get(option.externalId)
        if (!optionId) continue

        const planned = plannedEffects(question, option, refs)
        for (const [ordinal, plan] of planned.entries()) {
          const externalId = `${option.externalId}#${ordinal}`
          const row: EffectRow = {
            runId: scope.runId,
            answerOptionId: optionId,
            externalId,
            ordinal,
            ...plan.payload,
          }
          const [stored] = await scope
            .insert(effects, row)
            .onConflictDoUpdate({
              target: [effects.runId, effects.externalId],
              // Drizzle cannot type `set` over the generic insert; keys are the table's own.
              set: { ...row, runId: undefined, externalId: undefined } as never,
            })
            .returning({ id: effects.id })
          if (!stored) continue

          written.effects.add(stored.id)
          await writeInputs(scope, written, stored.id, plan.inputs)
        }
      }
    }
  }
}

const writeInputs = async (
  scope: RunScope,
  written: WrittenRows,
  effectId: string,
  inputs: PlannedEffect['inputs'],
): Promise<void> => {
  for (const [ordinal, input] of inputs.entries()) {
    const values = { inputKey: input.inputKey, sign: input.sign }
    const [row] = await scope
      .insert(effectInputs, { effectId, ordinal, ...values })
      .onConflictDoUpdate({
        target: [effectInputs.runId, effectInputs.effectId, effectInputs.ordinal],
        set: values,
      })
      .returning({ id: effectInputs.id })
    if (row) written.effectInputs.add(row.id)
  }
}

const plannedEffects = (
  question: ParsedQuestion,
  option: ParsedAnswerOption,
  refs: EntityIds,
): PlannedEffect[] => {
  const planned: PlannedEffect[] = []

  for (const impact of option.impacts) {
    const plan = impact.kind === 'skala' ? scalePlan(impact, refs) : resourcePlan(question, impact, refs)
    if (plan) planned.push(plan)
  }

  for (const blockId of option.blocks) {
    planned.push({ payload: { kind: 'blok', blockExternalId: blockId }, inputs: [] })
  }

  for (const effect of option.effects) {
    const kind = ANSWER_EFFECT_KINDS[effect.name]
    // §7.3: the partner comes from whoever the chosen option names, so the
    // author does not write an answer per pair of 23 characters.
    if (kind) planned.push({ payload: { kind, relatedFromAnswer: true }, inputs: [] })
  }

  return planned
}

const scalePlan = (impact: ScaleImpact, refs: EntityIds): PlannedEffect | undefined => {
  const scaleId = refs.scaleIds.get(impact.key)
  if (!scaleId) return undefined

  const amount = literalAmount(impact)

  return {
    payload: {
      kind: impact.mode === 'absolutni' ? 'nastaveni_skaly' : 'zmena_skaly',
      characterId: refs.characterIds.get(impact.owner) ?? null,
      scaleId,
      scaleDelta: impact.mode === 'posun' ? (amount ?? null) : null,
      // `=VALUE` takes the number from the answer, so nothing is stored here.
      scaleSetValue: impact.mode === 'absolutni' ? (amount ?? null) : null,
    },
    inputs: signedInputs(impact),
  }
}

/**
 * Routing (§4.4): a plain `R_Marie_Wealth` is decided by marital status after
 * the structural phase, `_private` and a household owner are the escape
 * hatches. A question flagged `Private` routes every impact to the personal
 * account, as if each carried the suffix.
 */
const resourcePlan = (
  question: ParsedQuestion,
  impact: ScaleImpact,
  refs: EntityIds,
): PlannedEffect | undefined => {
  const resourceId = refs.resourceIds.get(impact.key)
  if (!resourceId) return undefined

  const ownerCharacterId = refs.characterIds.get(impact.owner)
  const isHouseholdOwner = ownerCharacterId === undefined
  const forcedPrivate = impact.forcedPrivate || question.isPrivate

  const amount = literalAmount(impact)

  return {
    payload: {
      kind: impact.mode === 'absolutni' ? 'nastaveni_zdroje' : 'zmena_zdroje',
      characterId: ownerCharacterId ?? null,
      resourceId,
      resourceDelta: impact.mode === 'posun' ? (amount ?? null) : null,
      resourceSetValue: impact.mode === 'absolutni' ? (amount ?? null) : null,
      resourceTarget: isHouseholdOwner ? 'domacnost' : forcedPrivate ? 'osobni' : 'smerovany',
      householdExternalId: isHouseholdOwner ? impact.owner : null,
    },
    inputs: signedInputs(impact),
  }
}

const signedInputs = (impact: ScaleImpact): PlannedEffect['inputs'] => {
  const inputs: PlannedEffect['inputs'] = []
  const keys = inputKeys(impact)
  if (keys.length === 0) return inputs

  for (const term of impact.terms) {
    if (term.inputKey === undefined) continue
    inputs.push({ inputKey: term.inputKey, sign: term.sign })
  }

  return inputs
}
