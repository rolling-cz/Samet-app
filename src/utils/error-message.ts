/**
 * Readable text of anything thrown.
 *
 * Drizzle wraps a failed statement in an error whose message is the SQL and its
 * parameters; what the database actually objected to sits in `cause`. Reported
 * alone it reads `Failed query: insert into "characters" …` and never mentions
 * the column that does not exist, which sends the reader looking for the bug in
 * the import instead of in a stale database. The chain is therefore unwrapped
 * and the Postgres diagnostic fields appended.
 */

/** Postgres diagnostic fields worth showing, in the order they read best. */
const PG_DIAGNOSTIC_FIELDS = Object.freeze(['detail', 'hint', 'table_name', 'column_name', 'constraint_name'] as const)

/** Separates the wrapper's message from the cause below it. */
const CAUSE_SEPARATOR = ' — '

/** Separates the diagnostic fields appended to a Postgres error. */
const DIAGNOSTIC_SEPARATOR = '; '

/** How deep to follow `cause`; a chain longer than this is a loop, not a diagnosis. */
const MAX_CAUSE_DEPTH = 5

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/** `detail: …; column_name: …` for a `postgres.js` error, empty for anything else. */
const diagnostics = (error: unknown): string => {
  if (!isRecord(error)) return ''

  const parts: string[] = []
  for (const field of PG_DIAGNOSTIC_FIELDS) {
    const value = error[field]
    if (typeof value === 'string' && value !== '') parts.push(`${field}: ${value}`)
  }

  return parts.join(DIAGNOSTIC_SEPARATOR)
}

/** One link of the chain: its message plus whatever Postgres said about it. */
const describe = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error)
  const detail = diagnostics(error)

  return detail === '' ? message : `${message} (${detail})`
}

export const errorMessage = (cause: unknown): string => {
  const parts: string[] = [describe(cause)]
  let current = cause instanceof Error ? cause.cause : undefined

  for (let depth = 1; depth < MAX_CAUSE_DEPTH && current !== undefined && current !== null; depth += 1) {
    const described = describe(current)
    // A wrapper often just repeats its cause; saying it twice helps nobody.
    if (described !== '' && !parts.includes(described)) parts.push(described)
    current = current instanceof Error ? current.cause : undefined
  }

  return parts.join(CAUSE_SEPARATOR)
}
