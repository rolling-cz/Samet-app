/**
 * Phase 3: absolute settings from org questions first, then shifts — in the
 * order `VALUE_EFFECT_KINDS` lists them, and within a kind in sheet order.
 *
 * A scale is clamped after every shift, never once at the end (§4.1): `Regime`
 * 2 with `-2` then `+1` is 1 → 2, the other way round 3 → 1. A resource is
 * never clamped; its every delta goes to the trace.
 */
import { VALUE_EFFECT_KINDS, type ValueEffectKind } from '../constants/effectPhases'
import { addConflict, type EvaluationContext } from '../evaluationContext'
import { fail } from '../errors/engineInputError'
import type { ImpactDefinition } from '../types/impact'
import { clampToScale } from '../utils/clamp'
import { routeResource } from '../utils/resourceRouting'
import { characterStateOf, readResource, writeResource } from '../utils/stateAccess'
import type { ImpactInstance } from './collectEffects'
import { impactAmount, missingInputKeys } from './impactAmount'

const kindOf = (impact: ImpactDefinition): ValueEffectKind => {
  if (impact.mode === 'absolutni') return impact.kind === 'skala' ? 'nastaveni_skaly' : 'nastaveni_zdroje'

  return impact.kind === 'skala' ? 'zmena_skaly' : 'zmena_zdroje'
}

const applyScale = (context: EvaluationContext, instance: ImpactInstance, amount: number): void => {
  const { impact, source } = instance
  const scale =
    context.catalog.scales.get(impact.externalId) ?? fail('neznamy_odkaz', impact.externalId, 'unknown scale')
  const character = characterStateOf(context.state, scale.characterId)
  const before =
    character.scales[scale.key] ??
    fail('nekonzistentni_stav', impact.externalId, 'the character has no value for this scale')

  const raw = impact.mode === 'absolutni' ? amount : before + amount
  const clamped = clampToScale(scale, raw)
  character.scales[scale.key] = clamped.value

  if (impact.mode === 'absolutni') {
    context.trace.push({ phase: 'hodnotove', kind: 'nastaveni_skaly', characterId: scale.characterId, scaleKey: scale.key, before, after: clamped.value, source })
  } else {
    context.trace.push({ phase: 'hodnotove', kind: 'zmena_skaly', characterId: scale.characterId, scaleKey: scale.key, before, delta: amount, raw, after: clamped.value, source })
  }
  if (clamped.bound) {
    context.trace.push({ phase: 'hodnotove', kind: 'orez', characterId: scale.characterId, scaleKey: scale.key, raw, after: clamped.value, bound: clamped.bound, source })
  }
}

const applyResource = (context: EvaluationContext, instance: ImpactInstance, amount: number): void => {
  const { impact, source } = instance
  const reference =
    context.catalog.resolveResource(impact.owner, impact.key, impact.forcedPrivate) ??
    fail('neznamy_odkaz', impact.raw, 'unknown resource')
  // Routing reads the household state as the structural phase left it (§7.3).
  const routed = routeResource(context.state, reference)
  const before = readResource(context.state, routed.account, impact.key)
  const after = impact.mode === 'absolutni' ? amount : before + amount
  writeResource(context.state, routed.account, impact.key, after)

  if (impact.mode === 'absolutni') {
    context.trace.push({ phase: 'hodnotove', kind: 'nastaveni_zdroje', account: routed.account, resourceKey: impact.key, routing: routed.reason, before, after, source })

    return
  }
  context.trace.push({ phase: 'hodnotove', kind: 'zmena_zdroje', account: routed.account, resourceKey: impact.key, routing: routed.reason, before, delta: amount, after, source })
}

const applyOne = (context: EvaluationContext, instance: ImpactInstance): void => {
  const amount = impactAmount(instance)
  if (amount === undefined) {
    addConflict(context, {
      kind: 'nedopocitano',
      source: instance.source,
      raw: instance.impact.raw,
      missingInputKeys: missingInputKeys(instance),
    })

    return
  }

  if (instance.impact.kind === 'skala') applyScale(context, instance, amount)
  else applyResource(context, instance, amount)
}

export const applyValues = (context: EvaluationContext, impacts: ImpactInstance[]): void => {
  // Money derived from a refused household effect must not move either (§4.4).
  const active = impacts.filter(
    (instance) => instance.effectKey === undefined || !context.rejectedEffectKeys.has(instance.effectKey),
  )

  for (const kind of VALUE_EFFECT_KINDS) {
    for (const instance of active) {
      if (kindOf(instance.impact) === kind) applyOne(context, instance)
    }
  }
}
