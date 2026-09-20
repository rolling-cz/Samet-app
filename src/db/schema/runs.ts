import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { authorName, createdAt } from './columns'
import { cascadeDecision, chapterStatus, runStatus } from './enums'

/**
 * A run of the game — the top level of data isolation (§3.2, §3.3).
 * Deliberately not "session": that word is taken by the login session.
 *
 * `id` is the readable `2026-09-12_A` and is reused in export filenames (§10.4).
 */
export const runs = pgTable(
  'runs',
  {
    id: text('id').primaryKey(),
    startDate: text('start_date').notNull(),
    /** Run letter (`A`, `B`); also drives the UI colour (§3.3). */
    letter: text('letter').notNull(),
    label: text('label'),
    status: runStatus('status').notNull().default('created'),
    archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'date' }),
    createdAt: createdAt(),
    createdBy: authorName('created_by'),
  },
  (t) => [
    check('runs_id_format', sql`${t.id} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}_[A-Z]$'`),
    check('runs_letter_format', sql`${t.letter} ~ '^[A-Z]$'`),
  ],
)

/**
 * Chapter within a run (1–3). All three rows are created with the run so that
 * config import has something to attach questions to.
 *
 * `isTouched` is the cascade from §3.2: a change in an already released chapter
 * marks the following ones as touched, and the app recomputes nothing on its
 * own — it waits for the org's `cascadeDecision`.
 */
export const chapters = pgTable(
  'chapters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    number: integer('number').notNull(),
    status: chapterStatus('status').notNull().default('in_progress'),

    /** Released: documents are printed and in the players' hands (§3.2). */
    releasedAt: timestamp('released_at', { withTimezone: true, mode: 'date' }),
    releasedBy: text('released_by'),
    // Which computation was released lives in `computations.is_released`,
    // not here — otherwise the foreign keys would be circular.

    /** Cascade (§3.2). */
    isTouched: boolean('is_touched').notNull().default(false),
    touchedAt: timestamp('touched_at', { withTimezone: true, mode: 'date' }),
    touchedReason: text('touched_reason'),
    cascadeDecision: cascadeDecision('cascade_decision'),
    cascadeDecidedAt: timestamp('cascade_decided_at', { withTimezone: true, mode: 'date' }),
    cascadeDecidedBy: text('cascade_decided_by'),
    /**
     * Set when the org chose to keep the released state: the computed state
     * differs from what the players hold. The app must say so out loud.
     */
    divergesFromReleased: boolean('diverges_from_released').notNull().default(false),
    divergenceNote: text('divergence_note'),

    createdAt: createdAt(),
  },
  (t) => [
    unique('chapters_run_id_key').on(t.runId, t.id),
    unique('chapters_run_number_key').on(t.runId, t.number),
    check('chapters_number_range', sql`${t.number} between 1 and 3`),
  ],
)

