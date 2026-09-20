/**
 * Phase 2: households created and dissolved (§4.4, §7.3). Every
 * `HOUSEHOLD_DELETE` before any `HOUSEHOLD_CREATE`, so a divorce and a new
 * marriage in one chapter never leave a character in two households.
 *
 * A dissolved household keeps its record until the value phase has paid the
 * joint balance out (§4.4); `dropDissolvedHouseholds` removes it afterwards.
 */
import { householdIdOf } from '../catalog/buildCatalog'
import { STRUCTURAL_EFFECT_KINDS } from '../constants/effectPhases'
import { addConflict, type EvaluationContext } from '../evaluationContext'
import type { HouseholdState } from '../types/state'
import { compareIds } from '../utils/compareIds'
import { characterStateOf } from '../utils/stateAccess'
import type { CollectedEffects, EffectInstance, ImpactInstance } from './collectEffects'
import { impactAmount } from './impactAmount'

/** Zero on every joint account a resource can have (§4.4). */
const emptyJointAccounts = (context: EvaluationContext): Record<string, number> => {
  const resources: Record<string, number> = {}
  for (const [key, scope] of context.catalog.resourceScopes) {
    if (scope === 'household') resources[key] = 0
  }

  return resources
}

/**
 * The inputs of a dissolution must add up to what is on the joint account;
 * the engine never splits a remainder itself (§4.4). Checked per resource the
 * derived impacts pay out of the household.
 */
const checkPayout = (
  context: EvaluationContext,
  instance: EffectInstance,
  household: HouseholdState,
  householdId: string,
  impacts: ImpactInstance[],
): void => {
  for (const impact of impacts) {
    if (impact.effectKey !== instance.key || impact.impact.kind !== 'zdroj' || impact.impact.owner !== householdId) continue
    const amount = impactAmount(impact)
    // A missing input is reported by the value phase as `nedopocitano`.
    if (amount === undefined) continue

    const balance = household.resources[impact.impact.key] ?? 0
    if (balance + amount === 0) continue
    addConflict(context, {
      kind: 'rozdeleni_nesedi',
      source: instance.source,
      householdId,
      resourceKey: impact.impact.key,
      balance,
      inputsTotal: -amount,
    })
  }
}

const dissolve = (context: EvaluationContext, instance: EffectInstance, impacts: ImpactInstance[]): void => {
  const householdId = householdIdOf(instance.effect.members)
  const household = context.state.households[householdId]
  if (!household || context.dissolvedHouseholdIds.has(householdId)) {
    addConflict(context, { kind: 'domacnost_neexistuje', source: instance.source, householdId })
    context.rejectedEffectKeys.add(instance.key)

    return
  }

  checkPayout(context, instance, household, householdId, impacts)

  for (const memberId of household.memberIds) delete characterStateOf(context.state, memberId).householdId
  context.dissolvedHouseholdIds.add(householdId)
  context.trace.push({
    phase: 'strukturalni',
    kind: 'domacnost_zanik',
    householdId,
    memberIds: instance.effect.members,
    source: instance.source,
    balances: { ...household.resources },
  })
}

const create = (context: EvaluationContext, instance: EffectInstance): void => {
  const householdId = householdIdOf(instance.effect.members)
  let refused = false
  for (const memberId of instance.effect.members) {
    const current = characterStateOf(context.state, memberId).householdId
    if (current === undefined) continue
    addConflict(context, {
      kind: 'uz_v_domacnosti',
      source: instance.source,
      characterId: memberId,
      currentHouseholdId: current,
      householdId,
    })
    refused = true
  }
  if (refused) {
    context.rejectedEffectKeys.add(instance.key)

    return
  }

  // The same pair divorcing and remarrying in one chapter reuses the record:
  // the payout and the new deposits both land on it and the sums stay right.
  const existing = context.dissolvedHouseholdIds.has(householdId) ? context.state.households[householdId] : undefined
  context.dissolvedHouseholdIds.delete(householdId)
  context.state.households[householdId] = existing ?? {
    memberIds: [...instance.effect.members].sort(compareIds),
    resources: emptyJointAccounts(context),
  }
  for (const memberId of instance.effect.members) characterStateOf(context.state, memberId).householdId = householdId

  context.trace.push({
    phase: 'strukturalni',
    kind: 'domacnost_vznik',
    householdId,
    memberIds: instance.effect.members,
    source: instance.source,
  })
}

export const applyStructural = (context: EvaluationContext, collected: CollectedEffects): void => {
  for (const kind of STRUCTURAL_EFFECT_KINDS) {
    for (const instance of collected.effects) {
      if (instance.effect.kind !== kind) continue
      if (kind === 'domacnost_zanik') dissolve(context, instance, collected.impacts)
      else create(context, instance)
    }
  }
}

/** After the value phase: nothing of a dissolved household remains (§4.4). */
export const dropDissolvedHouseholds = (context: EvaluationContext): void => {
  for (const householdId of context.dissolvedHouseholdIds) delete context.state.households[householdId]
}
