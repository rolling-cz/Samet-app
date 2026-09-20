import { sql } from 'drizzle-orm'
import { boolean, check, foreignKey, integer, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core'
import { createdAt } from './columns'
import { stateSource } from './enums'
import { characters } from './characters'
import { scales } from './scales'
import { resources } from './resources'
import { computations } from './computations'
import { chapters, runs } from './runs'

/**
 * Per-chapter snapshots of a character's own state (§4.3).
 *
 * State is snapshotted after each chapter and never overwritten. Every row
 * carries the `computation_id` that produced it; `NULL` is the initial state
 * from config (chapter 1).
 */
/**
 * A character's scale value in a chapter.
 *
 * `wasClamped` and `rawValue` keep what the engine computed before clamping —
 * without them badly calibrated weights go unnoticed. The bounds themselves
 * are per character × scale (`character_scales`), so no range check can live
 * here.
 */
export const characterScaleValues = pgTable(
  'character_scale_values',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    chapterId: uuid('chapter_id').notNull(),
    characterId: uuid('character_id').notNull(),
    scaleId: uuid('scale_id').notNull(),
    /** Final value, after clamping. */
    value: integer('value').notNull(),
    /** Value before clamping, when clamping happened. */
    rawValue: integer('raw_value'),
    wasClamped: boolean('was_clamped').notNull().default(false),
    source: stateSource('source').notNull(),
    /** The computation that produced this value; NULL is the initial state. */
    computationId: uuid('computation_id'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('character_scale_values_unique')
      .on(t.runId, t.chapterId, t.characterId, t.scaleId, t.computationId)
      .nullsNotDistinct(),
    check(
      'character_scale_values_clamp_consistency',
      sql`(${t.wasClamped} = false) or (${t.rawValue} is not null and ${t.rawValue} <> ${t.value})`,
    ),
    foreignKey({
      name: 'character_scale_values_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'character_scale_values_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'character_scale_values_scale_fk',
      columns: [t.runId, t.scaleId],
      foreignColumns: [scales.runId, scales.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'character_scale_values_computation_fk',
      columns: [t.runId, t.computationId],
      foreignColumns: [computations.runId, computations.id],
    }).onDelete('restrict'),
  ],
)

/**
 * A character's personal resource value in a chapter (§4.1).
 *
 * No clamp columns: a resource has no upper bound, so there is nothing to clamp
 * and nothing to report. The audit carries the delta and the reason instead.
 *
 * For a `household` resource this is the personal account that survives
 * marriage (§4.4); the joint one lives in `household_resource_values`.
 */
export const characterResourceValues = pgTable(
  'character_resource_values',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    chapterId: uuid('chapter_id').notNull(),
    characterId: uuid('character_id').notNull(),
    resourceId: uuid('resource_id').notNull(),
    value: integer('value').notNull(),
    source: stateSource('source').notNull(),
    computationId: uuid('computation_id'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('character_resource_values_unique')
      .on(t.runId, t.chapterId, t.characterId, t.resourceId, t.computationId)
      .nullsNotDistinct(),
    foreignKey({
      name: 'character_resource_values_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'character_resource_values_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'character_resource_values_resource_fk',
      columns: [t.runId, t.resourceId],
      foreignColumns: [resources.runId, resources.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'character_resource_values_computation_fk',
      columns: [t.runId, t.computationId],
      foreignColumns: [computations.runId, computations.id],
    }).onDelete('restrict'),
  ],
)

/**
 * Template variables (§8.3): `{JMENO}`, `{PRIJMENI}` and whatever else a
 * template author invents.
 *
 * A table of its own because a surname changes with marriage, so the value is
 * per chapter, not per character. Overwriting `characters.last_name` would lose
 * the history and break rule 3.
 *
 * A value missing for a chapter is derived from `characters` and the state.
 */
export const characterVariables = pgTable(
  'character_variables',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    chapterId: uuid('chapter_id').notNull(),
    characterId: uuid('character_id').notNull(),
    /** Name without braces, upper case: `PRIJMENI`. */
    key: text('key').notNull(),
    value: text('value').notNull(),
    source: stateSource('source').notNull(),
    computationId: uuid('computation_id'),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('character_variables_unique')
      .on(t.runId, t.chapterId, t.characterId, t.key, t.computationId)
      .nullsNotDistinct(),
    check('character_variables_key_format', sql`${t.key} ~ '^[A-Z0-9_]+$'`),
    foreignKey({
      name: 'character_variables_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'character_variables_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'character_variables_computation_fk',
      columns: [t.runId, t.computationId],
      foreignColumns: [computations.runId, computations.id],
    }).onDelete('restrict'),
  ],
)
