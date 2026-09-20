/**
 * Database connection. Kept thin so that swapping the Postgres provider
 * touches only this file (§15).
 *
 * Deliberately not re-exported from `src/db/index.ts`: application code goes
 * through `forRun()`, which requires a `runId` (rule 2).
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = (): string => {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('Chybí DATABASE_URL. Zkopíruj .env.example do .env a doplň připojení.')
  }

  return url
}

/** Internal tool used by a few orgs at once; a small pool is plenty. */
const MAX_CONNECTIONS = 5

/** A frozen serverless instance must not keep a socket open on the provider. */
const IDLE_TIMEOUT_SECONDS = 20

/** Shorter than the function timeout, so a suspended database fails loudly. */
const CONNECT_TIMEOUT_SECONDS = 10

declare global {
  var __larpSql: ReturnType<typeof postgres> | undefined
}

/** Next.js reloads modules in dev, so the connection is kept on globalThis. */
const sql =
  globalThis.__larpSql ??
  postgres(connectionString(), {
    max: MAX_CONNECTIONS,
    idle_timeout: IDLE_TIMEOUT_SECONDS,
    connect_timeout: CONNECT_TIMEOUT_SECONDS,
    // Neon's pooled endpoint is PgBouncer in transaction mode, which rejects
    // named prepared statements. Fails at query time, never at build time.
    prepare: false,
  })
if (process.env.NODE_ENV !== 'production') globalThis.__larpSql = sql

/**
 * Unscoped connection. Only for migrations, seed, backups and importing config
 * into a run being created — cases where the run does not exist yet or the work
 * spans all runs. Application code must use `forRun()` instead.
 */
export const unscopedDb = drizzle(sql, { schema })

export type Database = typeof unscopedDb

export { sql as rawSql }
