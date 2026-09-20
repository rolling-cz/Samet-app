import type { RunScope } from '@/db'
import { households } from '@/db/schema'
import { FIRST_CHAPTER } from '@/db/constants/chapters'
import type { ParsedConfig } from '../types/parsed-config'
import type { IdMap } from './entity-ids'
import type { WrittenRows } from './written-rows'

/**
 * Households the game starts with — the `Household` column of `Characters`
 * (§4.2). They belong to chapter 1; anything later is created in play by
 * `HOUSEHOLD_CREATE` and is state, not config.
 *
 * A household whose column value does not match its members is left out: the
 * validation has already refused the config, and writing the wrong ID would put
 * money on an account nobody owns.
 */
export const upsertHouseholds = async (
  scope: RunScope,
  config: ParsedConfig,
  written: WrittenRows,
  chapterIds: IdMap<number>,
): Promise<IdMap> => {
  const householdIds: IdMap = new Map()
  const createdInChapterId = chapterIds.get(FIRST_CHAPTER)
  if (createdInChapterId === undefined) return householdIds

  for (const household of config.households) {
    // A household founded in play that the sheet now starts with becomes config.
    const values = { createdInChapterId, source: 'initial' as const }
    const [row] = await scope
      .insert(households, { externalId: household.externalId, ...values })
      .onConflictDoUpdate({ target: [households.runId, households.externalId], set: values })
      .returning({ id: households.id })
    if (!row) continue

    written.households.add(row.id)
    householdIds.set(household.externalId, row.id)
  }

  return householdIds
}
