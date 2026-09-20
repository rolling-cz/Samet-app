import { eq } from 'drizzle-orm'
import type { RunScope } from '@/db'
import {
  characterResourceValues,
  characterScaleValues,
  computations,
  householdMemberships,
  householdResourceValues,
  selectedVariations,
} from '@/db/schema'
import { pickBaseline } from '../convert/pick-baseline'
import type { ComputationSummary } from '../types/baseline'
import type { SnapshotRows } from '../types/snapshot-rows'

export const loadBaseline = async (scope: RunScope, chapterId: string): Promise<ComputationSummary | undefined> =>
  pickBaseline(
    await scope.selectColumns(
      computations,
      {
        id: computations.id,
        version: computations.version,
        status: computations.status,
        isReleased: computations.isReleased,
      },
      eq(computations.chapterId, chapterId),
    ),
  )

/** The state a computation left behind, as its snapshot rows. */
export const loadSnapshotRows = async (scope: RunScope, computationId: string): Promise<SnapshotRows> => ({
  scaleValues: await scope.selectColumns(
    characterScaleValues,
    {
      characterId: characterScaleValues.characterId,
      scaleId: characterScaleValues.scaleId,
      value: characterScaleValues.value,
      rawValue: characterScaleValues.rawValue,
      wasClamped: characterScaleValues.wasClamped,
    },
    eq(characterScaleValues.computationId, computationId),
  ),
  resourceValues: await scope.selectColumns(
    characterResourceValues,
    {
      characterId: characterResourceValues.characterId,
      resourceId: characterResourceValues.resourceId,
      value: characterResourceValues.value,
    },
    eq(characterResourceValues.computationId, computationId),
  ),
  memberships: await scope.selectColumns(
    householdMemberships,
    { characterId: householdMemberships.characterId, householdId: householdMemberships.householdId },
    eq(householdMemberships.computationId, computationId),
  ),
  householdResourceValues: await scope.selectColumns(
    householdResourceValues,
    {
      householdId: householdResourceValues.householdId,
      resourceId: householdResourceValues.resourceId,
      value: householdResourceValues.value,
    },
    eq(householdResourceValues.computationId, computationId),
  ),
  selectedVariations: await scope.selectColumns(
    selectedVariations,
    { blockId: selectedVariations.blockId, blockVariationId: selectedVariations.blockVariationId },
    eq(selectedVariations.computationId, computationId),
  ),
})
