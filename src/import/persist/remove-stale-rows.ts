/**
 * Config rows the re-uploaded sheet no longer carries (§6.5).
 *
 * A run has one valid config, so an entity dropped from the sheet has to leave
 * the database too — otherwise the engine would keep computing with it.
 */
import { inArray, type SQL } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'
import { isForeignKeyViolation, type RunScope, type RunScopedTable } from '@/db'
import {
  answerOptions,
  blockVariations,
  characterResources,
  characterScales,
  characters,
  contentBlocks,
  effectInputs,
  effects,
  groups,
  questions,
  resources,
  scales,
} from '@/db/schema'
import { errors } from '@/locales/cs/errors'
import { listLabels } from '../utils/list-labels'
import type { WrittenRows } from './written-rows'

type ImportedTable = RunScopedTable & { id: PgColumn }

/**
 * Rows derived from answer options rather than written by the author. Dropping
 * them is part of fixing a scale impact, so even a frozen config may.
 */
const DERIVED_KINDS: ReadonlySet<keyof WrittenRows> = new Set(['effects', 'effectInputs'])

export interface StaleRows {
  kind: keyof WrittenRows
  table: ImportedTable
  derived: boolean
  ids: string[]
  /** Source IDs as the author knows them. */
  labels: string[]
}

const collect = async <T extends ImportedTable>(
  scope: RunScope,
  written: WrittenRows,
  kind: keyof WrittenRows,
  table: T,
  describe: (row: T['$inferSelect']) => { id: string; label: string },
  condition?: SQL,
): Promise<StaleRows> => {
  const stale: StaleRows = { kind, table, derived: DERIVED_KINDS.has(kind), ids: [], labels: [] }

  for (const row of await scope.select(table, condition)) {
    const { id, label } = describe(row)
    if (written[kind].has(id)) continue

    stale.ids.push(id)
    stale.labels.push(label)
  }

  return stale
}

/** In delete order: dependents first, because every foreign key is `restrict`. */
export const findStaleRows = async (scope: RunScope, written: WrittenRows): Promise<StaleRows[]> => [
  await collect(scope, written, 'effectInputs', effectInputs, (r) => ({ id: r.id, label: r.inputKey })),
  await collect(scope, written, 'effects', effects, (r) => ({ id: r.id, label: r.externalId })),
  await collect(scope, written, 'answerOptions', answerOptions, (r) => ({ id: r.id, label: r.externalId })),
  await collect(scope, written, 'questions', questions, (r) => ({ id: r.id, label: r.externalId })),
  await collect(scope, written, 'blockVariations', blockVariations, (r) => ({ id: r.id, label: r.externalId })),
  await collect(scope, written, 'contentBlocks', contentBlocks, (r) => ({ id: r.id, label: r.externalId })),
  await collect(scope, written, 'characterScales', characterScales, (r) => ({ id: r.id, label: r.externalId })),
  await collect(scope, written, 'characterResources', characterResources, (r) => ({ id: r.id, label: r.externalId })),
  await collect(scope, written, 'scales', scales, (r) => ({ id: r.id, label: r.key })),
  await collect(scope, written, 'resources', resources, (r) => ({ id: r.id, label: r.key })),
  await collect(scope, written, 'characters', characters, (r) => ({ id: r.id, label: r.externalId })),
  await collect(scope, written, 'groups', groups, (r) => ({ id: r.id, label: r.externalId })),
]

/** Source IDs of stale entities the author wrote; derived rows are left out. */
export const staleAuthoredLabels = (stale: readonly StaleRows[]): string[] => {
  const labels: string[] = []
  for (const rows of stale) {
    if (!rows.derived) labels.push(...rows.labels)
  }

  return labels
}

/** Returns how many rows were removed. */
export const removeStaleRows = async (scope: RunScope, stale: readonly StaleRows[]): Promise<number> => {
  let removed = 0

  for (const rows of stale) {
    if (rows.ids.length === 0) continue

    try {
      await scope.delete(rows.table, inArray(rows.table.id, rows.ids))
    } catch (cause) {
      if (!isForeignKeyViolation(cause)) throw cause

      throw new Error(errors.staleRowsInUse(listLabels(rows.labels)))
    }
    removed += rows.ids.length
  }

  return removed
}
