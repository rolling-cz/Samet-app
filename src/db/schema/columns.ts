/**
 * Shared schema conventions.
 *
 * Rule 2: every game-data table carries `run_id` and every reference inside a
 * run is a composite foreign key `(run_id, <id>)`, so the database itself
 * rejects an answer from run A attached to a question from run B.
 *
 * Rule 3: every foreign key is `onDelete: 'restrict'` — an archived run stays
 * browsable forever (§3.2).
 */
import { customType, timestamp, text } from 'drizzle-orm/pg-core'

/** Raw file bytes; Drizzle 0.44 has no built-in `bytea`. */
export const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' })

export const createdAt = () =>
  timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()

/**
 * Who did it — free text from the „Kdo jsi?" field (§3.1). Unverified, and the
 * only source of identity in the app.
 *
 * The column name is a parameter because each table names the author after the
 * act: `created_by`, `answered_by`, `rolled_by`, `author`.
 */
export const authorName = (column: string) => text(column).notNull()
