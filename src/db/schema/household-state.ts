import { foreignKey, integer, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core'
import { createdAt } from './columns'
import { stateSource } from './enums'
import { characters } from './characters'
import { households } from './households'
import { resources } from './resources'
import { computations } from './computations'
import { chapters, runs } from './runs'

/**
 * Per-chapter household membership and joint account balances (§4.4).
 *
 * State is snapshotted after each chapter and never overwritten. Every row
 * carries the `computation_id` that produced it; `NULL` is the initial state
 * from config (chapter 1).
 */
/**
 * Who lives in which household — a per-chapter snapshot (§4.4).
 *
 * A character is in at most one household at a time, enforced by a unique on
 * (run, chapter, character, computation) rather than by a consistency check:
 * routing an impact to the joint account rests on that invariant.
 *
 * The table is sparse on purpose: a single character has no row, because they
 * are not a household of one — their money simply stays personal.
 */
export const householdMemberships = pgTable(
  'household_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    chapterId: uuid('chapter_id').notNull(),
    characterId: uuid('character_id').notNull(),
    householdId: uuid('household_id').notNull(),
    source: stateSource('source').notNull(),
    computationId: uuid('computation_id'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('household_memberships_one_per_character')
      .on(t.runId, t.chapterId, t.characterId, t.computationId)
      .nullsNotDistinct(),
    foreignKey({
      name: 'household_memberships_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'household_memberships_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'household_memberships_household_fk',
      columns: [t.runId, t.householdId],
      foreignColumns: [households.runId, households.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'household_memberships_computation_fk',
      columns: [t.runId, t.computationId],
      foreignColumns: [computations.runId, computations.id],
    }).onDelete('restrict'),
  ],
)

/**
 * The joint account (§4.4) — owned by the household, not by a character, so a
 * shared value is never copied between spouses.
 *
 * Only `household`-scoped resources belong here. The database cannot check the
 * scope (it spans tables); the §11 consistency check does.
 *
 * Contributions of both members add up: both earn into the same account.
 */
export const householdResourceValues = pgTable(
  'household_resource_values',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    chapterId: uuid('chapter_id').notNull(),
    householdId: uuid('household_id').notNull(),
    resourceId: uuid('resource_id').notNull(),
    value: integer('value').notNull(),
    source: stateSource('source').notNull(),
    computationId: uuid('computation_id'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('household_resource_values_unique')
      .on(t.runId, t.chapterId, t.householdId, t.resourceId, t.computationId)
      .nullsNotDistinct(),
    foreignKey({
      name: 'household_resource_values_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'household_resource_values_household_fk',
      columns: [t.runId, t.householdId],
      foreignColumns: [households.runId, households.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'household_resource_values_resource_fk',
      columns: [t.runId, t.resourceId],
      foreignColumns: [resources.runId, resources.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'household_resource_values_computation_fk',
      columns: [t.runId, t.computationId],
      foreignColumns: [computations.runId, computations.id],
    }).onDelete('restrict'),
  ],
)
