/**
 * Drops the whole database and leaves it empty — a clean start for local
 * development. `npm run db:reset` follows it with `db:setup`.
 *
 * This is the one place allowed to destroy data wholesale (rule 3 forbids it
 * everywhere else), so it refuses to run against anything but a local server
 * unless `--force` is given. A stale local schema is a routine annoyance; the
 * same command aimed at Neon would not be.
 *
 * `drizzle` holds the migration journal: it has to go too, otherwise the next
 * `db:migrate` believes migrations already applied to a database that is empty.
 */
import 'dotenv/config'
import { rawSql } from '../src/db/client'

/** Hosts treated as a throwaway development database. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

const isLocal = (url: string): boolean => {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname)
  } catch {
    return false
  }
}

const main = async () => {
  const url = process.env.DATABASE_URL ?? ''
  const forced = process.argv.includes('--force')

  if (!isLocal(url) && !forced) {
    throw new Error(
      `DATABASE_URL nemíří na lokální server (${new URL(url).hostname}). ` +
        'Reset smaže úplně všechna data. Když to fakt chceš, pusť `npm run db:reset -- --force`.',
    )
  }

  process.stdout.write(`→ mažu schémata public a drizzle na ${new URL(url).hostname}\n`)
  await rawSql.unsafe('drop schema if exists public cascade')
  await rawSql.unsafe('drop schema if exists drizzle cascade')
  await rawSql.unsafe('create schema public')

  process.stdout.write('Databáze je prázdná. Schéma doplní `npm run db:setup`.\n')
  await rawSql.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
