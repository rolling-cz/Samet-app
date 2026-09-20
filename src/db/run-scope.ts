/**
 * Access to a run's data (architecture rule 2).
 *
 * Two runs are played at once and their data must never meet. The isolation
 * holds through code structure, not discipline: application code has no
 * unscoped connection and a query without a `runId` cannot be written here —
 * `select()` and `insert()` add the `run_id` condition themselves.
 *
 * A query this layer cannot express (a multi-table join) gets a new method
 * here, never a bypass in the application.
 */
import { and, eq, type SQL } from 'drizzle-orm'
import { type PgColumn, PgTable } from 'drizzle-orm/pg-core'
import { unscopedDb, type Database } from './client'

/** A table `RunScope` can serve: it must have a `run_id` column. */
export type RunScopedTable = PgTable & { runId: PgColumn }

/** Run identifier (`2026-09-12_A`). Branded so any string cannot pass as one. */
export type RunId = string & { readonly __brand: 'RunId' }

/** `<date>_<letter>`, e.g. `2026-09-12_A`; the letter drives the UI colour. */
const RUN_ID_PATTERN = /^\d{4}-\d{2}-\d{2}_[A-Z]$/

/** Validates the run identifier's shape and brands it. */
export const parseRunId = (value: string): RunId => {
  if (!RUN_ID_PATTERN.test(value)) {
    throw new Error(`Neplatné ID běhu: ${value}. Očekává se tvar 2026-09-12_A.`)
  }

  return value as RunId
}

/** Insert payload without `runId`; `RunScope` fills it in. */
type InsertWithoutRun<T extends RunScopedTable> = Omit<T['$inferInsert'], 'runId'>

export class RunScope {
  constructor(
    readonly runId: RunId,
    private readonly db: Database = unscopedDb,
  ) {}

  /** `run_id = ...` for hand-assembled queries. */
  belongsToRun<T extends RunScopedTable>(table: T): SQL {
    return eq(table.runId, this.runId)
  }

  /** Adds `run_id = ...` to further conditions. */
  scoped<T extends RunScopedTable>(table: T, ...conditions: (SQL | undefined)[]): SQL {
    return and(this.belongsToRun(table), ...conditions) as SQL
  }

  /**
   * `select * from <table> where run_id = ... [and ...]`
   *
   * Returns a finished `Promise`, not a chainable builder: Drizzle cannot type
   * `from()` over a generic table. `order by`, `limit` or joins get their own
   * method here rather than a query outside this layer.
   */
  select<T extends RunScopedTable>(
    table: T,
    ...conditions: (SQL | undefined)[]
  ): Promise<T['$inferSelect'][]> {
    return this.db
      .select()
      .from(table as PgTable)
      .where(this.scoped(table, ...conditions)) as Promise<T['$inferSelect'][]>
  }

  /** Like `select()`, but reads only the given columns — archived files and computation JSON are large. */
  selectColumns<T extends RunScopedTable, F extends Record<string, PgColumn>>(
    table: T,
    fields: F,
    ...conditions: (SQL | undefined)[]
  ) {
    return this.db
      .select(fields)
      .from(table as PgTable)
      .where(this.scoped(table, ...conditions))
  }

  /** Insert with `run_id` filled in automatically. */
  insert<T extends RunScopedTable>(table: T, values: InsertWithoutRun<T> | InsertWithoutRun<T>[]) {
    const rows = (Array.isArray(values) ? values : [values]).map((row) => ({
      ...row,
      runId: this.runId,
    }))

    // `values()` cannot be typed through the generic, but the rows above are
    // already derived from `$inferInsert`.
    return this.db.insert(table).values(rows as never)
  }

  /**
   * Run-scoped update. Most tables are never updated by design (rule 3); the
   * legitimate cases are chapter state, the touched flag, parking ordinals
   * during a config import, and editing an answer (whose history the audit holds).
   */
  update<T extends RunScopedTable>(table: T, ...conditions: (SQL | undefined)[]) {
    return {
      set: (values: { [K in keyof T['$inferInsert']]?: T['$inferInsert'][K] | SQL }) =>
        this.db
          .update(table)
          .set(values as never)
          .where(this.scoped(table, ...conditions)),
    }
  }

  /**
   * Run-scoped delete. Two legitimate uses: the config import dropping entities
   * a re-uploaded sheet no longer carries — only before the first computation
   * (§6.5) — and cancelling an answer back to "nobody answered yet", always
   * with an audit entry (rule 3). `restrict` foreign keys still protect
   * anything entered against them.
   */
  delete<T extends RunScopedTable>(table: T, ...conditions: (SQL | undefined)[]) {
    return this.db.delete(table).where(this.scoped(table, ...conditions))
  }

  /** Transaction under the same run scope. */
  transaction<R>(fn: (scope: RunScope) => Promise<R>): Promise<R> {
    return this.db.transaction((tx) => fn(new RunScope(this.runId, tx as unknown as Database)))
  }
}

/**
 * The only way application code reaches a run's data.
 *
 * ```ts
 * const run = forRun('2026-09-12_A')
 * const postavy = await run.select(characters)
 * ```
 */
export const forRun = (runId: string | RunId, db?: Database): RunScope => {
  return new RunScope(parseRunId(runId), db)
}
