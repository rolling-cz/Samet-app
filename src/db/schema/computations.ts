import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { authorName, createdAt } from './columns'
import { computationKind, computationStatus } from './enums'
import { chapters, runs } from './runs'
import { uploadedFiles } from './uploads'

/**
 * One version of a computation (§5, steps 4–6).
 *
 * Recomputing is repeatable and non-destructive — every run is a new row, never
 * an update, so a dry-run can be fired a hundred times before confirmation.
 * `kind = 'rucni_uprava'` is a version produced by editing the intermediate
 * JSON; `parentComputationId` points at what it started from.
 *
 * `resultJson` is the complete state exactly as the engine returned it (and as
 * the org edits it). The relational state tables in `state.ts` are a queryable
 * projection of it for overviews; `resultJson` is the untouchable archive and
 * the basis of `beh.json` (§10.4).
 *
 * `isReleased` marks the version that was printed from — at most one per
 * chapter, enforced by a partial unique index (§3.2).
 */
export const computations = pgTable(
  'computations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    chapterId: uuid('chapter_id').notNull(),
    version: integer('version').notNull(),
    kind: computationKind('kind').notNull().default('prepocet'),
    status: computationStatus('status').notNull().default('navrh'),
    parentComputationId: uuid('parent_computation_id'),

    /** The archived `.xlsx` the config came from, so it can be traced after the game (§6.5). */
    configUploadId: uuid('config_upload_id').notNull(),
    /** Engine code version, to tell what produced this. */
    engineVersion: text('engine_version').notNull(),
    /**
     * Hash of the inputs (state + answers + config + dice). Same input, same
     * output (§2); a differing hash on a supposedly identical run is an alarm.
     */
    inputHash: text('input_hash').notNull(),

    /** The complete new state as the engine returned it, or as the org edited it. */
    resultJson: jsonb('result_json').notNull(),
    /** `trace[]`, the basis for explaining "why" in the UI (§7.5). */
    traceJson: jsonb('trace_json').notNull(),
    /** Unresolved equal-priority conflicts (§7.3); they block confirmation. */
    conflictsJson: jsonb('conflicts_json'),

    /** Reason for the run or edit; mandatory on a released chapter (§3.2). */
    reason: text('reason'),

    isReleased: boolean('is_released').notNull().default(false),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true, mode: 'date' }),
    confirmedBy: text('confirmed_by'),

    createdAt: createdAt(),
    createdBy: authorName('created_by'),
  },
  (t) => [
    unique('computations_run_id_key').on(t.runId, t.id),
    unique('computations_chapter_version_key').on(t.runId, t.chapterId, t.version),
    uniqueIndex('computations_one_released_per_chapter')
      .on(t.runId, t.chapterId)
      .where(sql`${t.isReleased}`),
    check('computations_version_positive', sql`${t.version} >= 1`),
    check(
      'computations_manual_has_parent',
      sql`${t.kind} <> 'rucni_uprava' or ${t.parentComputationId} is not null`,
    ),
    foreignKey({
      name: 'computations_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'computations_parent_fk',
      columns: [t.runId, t.parentComputationId],
      foreignColumns: [t.runId, t.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'computations_config_upload_fk',
      columns: [t.runId, t.configUploadId],
      foreignColumns: [uploadedFiles.runId, uploadedFiles.id],
    }).onDelete('restrict'),
  ],
)
