import { sql } from 'drizzle-orm'
import { check, foreignKey, integer, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core'
import { createdAt } from './columns'
import { characters } from './characters'
import { runs } from './runs'

/**
 * Scale definition (§4.1), e.g. `Regime`, `Control`, `Smutek`.
 *
 * Bounds are deliberately NOT here: `Min` and `Max` belong to the pair
 * character × scale (§4.2, sheet `Scales`), so two characters may track the
 * same scale on different ranges. Reading a bound from anywhere but
 * `character_scales` is a bug.
 *
 * A scale always belongs to one character. Anything shared between spouses is a
 * resource, not a scale (§4.1).
 */
export const scales = pgTable(
  'scales',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** Scale key without the character prefix: `Regime`. */
    key: text('key').notNull(),
    label: text('label').notNull(),
    description: text('description'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('scales_run_id_key').on(t.runId, t.id),
    unique('scales_run_key_key').on(t.runId, t.key),
  ],
)

/**
 * Which scales a character tracks, on what range and from what starting value
 * (§4.2, sheet `Scales`).
 *
 * The source spreadsheet writes this as `S_<Postava>_<Skala>`; here it is
 * decomposed into character + scale. `defaultValue` is the starting value for
 * chapter 1 only — from chapter 2 the engine starts from the previous
 * chapter's snapshot.
 */
export const characterScales = pgTable(
  'character_scales',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    characterId: uuid('character_id').notNull(),
    scaleId: uuid('scale_id').notNull(),
    /** Full ID from the source spreadsheet, e.g. `S_Marie_Regime`. */
    externalId: text('external_id').notNull(),
    minValue: integer('min_value').notNull(),
    maxValue: integer('max_value').notNull(),
    /** Starting value for chapter 1. */
    defaultValue: integer('default_value').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('character_scales_run_id_key').on(t.runId, t.id),
    unique('character_scales_unique').on(t.runId, t.characterId, t.scaleId),
    unique('character_scales_external_key').on(t.runId, t.externalId),
    check('character_scales_range_sane', sql`${t.minValue} < ${t.maxValue}`),
    check(
      'character_scales_default_in_range',
      sql`${t.defaultValue} between ${t.minValue} and ${t.maxValue}`,
    ),
    foreignKey({
      name: 'character_scales_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'character_scales_scale_fk',
      columns: [t.runId, t.scaleId],
      foreignColumns: [scales.runId, scales.id],
    }).onDelete('restrict'),
  ],
)
