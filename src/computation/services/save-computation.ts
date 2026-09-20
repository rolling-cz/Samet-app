import { eq } from 'drizzle-orm'
import type { RunScope } from '@/db'
import {
  auditLog,
  characterResourceValues,
  characterScaleValues,
  computations,
  diceRolls,
  householdMemberships,
  householdResourceValues,
  households,
  selectedVariations,
} from '@/db/schema'
import { ENGINE_VERSION, type EvaluateResult, type RollInput } from '@/engine'
import { audit } from '@/locales/cs/audit'
import { COMPUTATION_AUDIT_ACTIONS } from '../constants/audit-actions'
import { DICE_SIDES } from '../constants/dice'
import { householdsToCreate, stateToSnapshot } from '../convert/state-to-snapshot'
import type { IdDirectory } from '../types/id-directory'

/** `computations_version_positive`: the first computation of a chapter is version 1. */
const FIRST_VERSION = 1

export interface ComputationToSave {
  chapter: number
  chapterId: string
  result: EvaluateResult
  newRolls: RollInput[]
  configUploadId: string
  inputHash: string
  author: string
}

export interface SavedComputation {
  computationId: string
  version: number
}

/** A household the computation founded gets its identity row; its ID is derived, so it can only ever mean this pair. */
const withNewHouseholds = async (
  scope: RunScope,
  input: ComputationToSave,
  directory: IdDirectory,
): Promise<IdDirectory> => {
  const externalIds = householdsToCreate(input.result.state, directory)
  if (externalIds.length === 0) return directory

  const created = await scope
    .insert(
      households,
      externalIds.map((externalId) => ({ externalId, createdInChapterId: input.chapterId, source: 'computation' as const })),
    )
    .returning({ id: households.id, externalId: households.externalId })

  return { ...directory, households: directory.households.with(created) }
}

const nextVersion = async (scope: RunScope, chapterId: string): Promise<number> => {
  const rows = await scope.selectColumns(computations, { version: computations.version }, eq(computations.chapterId, chapterId))

  return rows.reduce((highest, row) => Math.max(highest, row.version + 1), FIRST_VERSION)
}

/**
 * Writes a computation: always new rows, never an update (rule 3). Must run
 * inside the caller's transaction — the computation, its snapshot, the
 * selected variants, the new rolls and the audit are saved together or not at all.
 */
export const saveComputation = async (
  scope: RunScope,
  input: ComputationToSave,
  baseDirectory: IdDirectory,
): Promise<SavedComputation> => {
  const { result, chapterId, author } = input
  const directory = await withNewHouseholds(scope, input, baseDirectory)
  const version = await nextVersion(scope, chapterId)

  const [computation] = await scope
    .insert(computations, {
      chapterId,
      version,
      kind: 'computation',
      status: 'draft',
      configUploadId: input.configUploadId,
      engineVersion: ENGINE_VERSION,
      inputHash: input.inputHash,
      resultJson: result.state,
      traceJson: result.trace,
      conflictsJson: result.conflicts,
      createdBy: author,
    })
    .returning({ id: computations.id })
  if (!computation) throw new Error('the computation row was not written')

  const computationId = computation.id
  const snapshot = stateToSnapshot(result.state, result.trace, directory)
  const stamp = { chapterId, computationId, source: 'computation' as const }

  if (snapshot.scaleValues.length > 0) {
    await scope.insert(characterScaleValues, snapshot.scaleValues.map((row) => ({ ...row, ...stamp })))
  }
  if (snapshot.resourceValues.length > 0) {
    await scope.insert(characterResourceValues, snapshot.resourceValues.map((row) => ({ ...row, ...stamp })))
  }
  if (snapshot.memberships.length > 0) {
    await scope.insert(householdMemberships, snapshot.memberships.map((row) => ({ ...row, ...stamp })))
  }
  if (snapshot.householdResourceValues.length > 0) {
    await scope.insert(householdResourceValues, snapshot.householdResourceValues.map((row) => ({ ...row, ...stamp })))
  }
  if (snapshot.selectedVariations.length > 0) {
    await scope.insert(selectedVariations, snapshot.selectedVariations.map((row) => ({ ...row, computationId })))
  }

  if (input.newRolls.length > 0) {
    await scope.insert(
      diceRolls,
      input.newRolls.map((roll) => ({
        blockVariationId: directory.variations.toDb(roll.variationId),
        occurrence: roll.occurrence,
        sides: DICE_SIDES,
        value: roll.value,
        rolledBy: author,
      })),
    )
  }

  await scope.insert(auditLog, [
    {
      chapterId,
      action: COMPUTATION_AUDIT_ACTIONS.run,
      entityKind: 'computations',
      entityId: computationId,
      summary: audit.computationRun(scope.runId, input.chapter, version, result.conflicts.length),
      valueAfter: { version, conflicts: result.conflicts.length, inputHash: input.inputHash },
      computationId,
      author,
    },
    ...input.newRolls.map((roll) => ({
      chapterId,
      action: COMPUTATION_AUDIT_ACTIONS.roll,
      entityKind: 'dice_rolls',
      entityId: `${roll.variationId}#${roll.occurrence}`,
      summary: audit.rollCreated(roll.variationId, roll.occurrence, roll.value),
      valueAfter: { value: roll.value },
      computationId,
      author,
    })),
    // Every clamp is a sign of badly tuned weights, never a detail (§4.1).
    ...result.trace.flatMap((entry) =>
      entry.kind !== 'clamp'
        ? []
        : [
            {
              chapterId,
              action: COMPUTATION_AUDIT_ACTIONS.clamp,
              entityKind: 'character_scale_values',
              entityId: `S_${entry.characterId}_${entry.scaleKey}`,
              summary: audit.scaleClamped(entry.characterId, entry.scaleKey, entry.raw, entry.after),
              valueBefore: { raw: entry.raw },
              valueAfter: { value: entry.after, bound: entry.bound },
              computationId,
              author,
            },
          ],
    ),
  ])

  return { computationId, version }
}
