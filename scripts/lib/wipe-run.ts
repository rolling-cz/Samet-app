/**
 * Drops one run with everything in it. Only for the local runs the scripts
 * create themselves (`seed.ts`, `compute-demo.ts`) — a real run is never deleted (rule 3).
 */
import { eq, sql } from 'drizzle-orm'
import { unscopedDb } from '../../src/db/client'
import type { RunScopedTable } from '../../src/db/run-scope'
import {
  answerInputValues,
  answerOptions,
  answerSelectedOptions,
  answers,
  auditLog,
  blockVariations,
  characterResourceValues,
  characterResources,
  characterScaleValues,
  characterScales,
  characterVariables,
  characters,
  chapters,
  computations,
  contentBlocks,
  diceRolls,
  effectInputs,
  effects,
  groups,
  householdMemberships,
  householdResourceValues,
  householdResources,
  households,
  questions,
  resources,
  runs,
  scales,
  selectedVariations,
  templates,
  uploadedFiles,
} from '../../src/db/schema'

/** Dependents first — every foreign key is `restrict`. */
const WIPE_ORDER: readonly RunScopedTable[] = Object.freeze([
  auditLog,
  characterVariables,
  selectedVariations,
  characterScaleValues,
  characterResourceValues,
  householdResourceValues,
  householdMemberships,
  diceRolls,
  answerInputValues,
  answerSelectedOptions,
  answers,
  computations,
  effectInputs,
  effects,
  answerOptions,
  questions,
  blockVariations,
  contentBlocks,
  templates,
  characterScales,
  characterResources,
  householdResources,
  scales,
  resources,
  characters,
  households,
  groups,
  uploadedFiles,
  chapters,
])

export const wipeRun = async (runId: string): Promise<void> => {
  await unscopedDb.transaction(async (tx) => {
    // The append-only trigger (`db/sql/001_audit_append_only.sql`) would refuse
    // the audit delete. `alter table` holds an exclusive lock until commit, so
    // nothing else can touch `audit_log` while the trigger is off.
    await tx.execute(sql`alter table audit_log disable trigger user`)
    for (const table of WIPE_ORDER) {
      await tx.delete(table).where(eq(table.runId, runId))
    }
    await tx.delete(runs).where(eq(runs.id, runId))
    await tx.execute(sql`alter table audit_log enable trigger user`)
  })
}
