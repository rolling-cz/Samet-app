import type { RunScope } from '@/db'
import { groups } from '@/db/schema'
import type { ParsedConfig } from '../types/parsed-config'
import type { IdMap } from './entity-ids'
import type { WrittenRows } from './written-rows'

/**
 * Groups from the `Groups` sheet (§4.2).
 *
 * Returns both the group ID and its name mapped to the database row: blocks and
 * characters refer to a group by whichever the author had at hand.
 */
export const upsertGroups = async (
  scope: RunScope,
  config: ParsedConfig,
  written: WrittenRows,
): Promise<IdMap> => {
  const groupIds: IdMap = new Map()

  for (const group of config.groups) {
    const values = { name: group.name }
    const [row] = await scope
      .insert(groups, { externalId: group.externalId, ...values })
      .onConflictDoUpdate({ target: [groups.runId, groups.externalId], set: values })
      .returning({ id: groups.id })
    if (!row) continue

    written.groups.add(row.id)
    groupIds.set(group.externalId, row.id)
    if (!groupIds.has(group.name)) groupIds.set(group.name, row.id)
  }

  return groupIds
}
