import { foreignKey, integer, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core'
import { createdAt } from './columns'
import { resourceScope } from './enums'
import { characters } from './characters'
import { households } from './households'
import { runs } from './runs'

/**
 * Resource definition (§4.1), e.g. `Wealth`, `Bony`.
 *
 * Unlike a scale, a resource has **no upper bound and is never clamped** — it
 * is a bank balance, not an opinion. Every change is audited with its delta and
 * reason instead.
 *
 * `scope` decides whether the resource can also live on a joint account
 * (§4.4). A `household` resource exists twice for a married character: their
 * own `character_resource_values` row and the household's. Which one an impact
 * hits is decided by routing, after the structural phase.
 */
export const resources = pgTable(
  'resources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** Resource key without the owner prefix: `Wealth`. */
    key: text('key').notNull(),
    label: text('label').notNull(),
    description: text('description'),
    scope: resourceScope('scope').notNull().default('private'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('resources_run_id_key').on(t.runId, t.id),
    unique('resources_run_key_key').on(t.runId, t.key),
  ],
)

/**
 * Which resources a character holds and with what starting value (§4.2, sheet
 * `Resources`). No `Min` / `Max`: resources are unbounded.
 */
export const characterResources = pgTable(
  'character_resources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    characterId: uuid('character_id').notNull(),
    resourceId: uuid('resource_id').notNull(),
    /** Full ID from the source spreadsheet, e.g. `R_Marie_Wealth`. */
    externalId: text('external_id').notNull(),
    /** Starting value for chapter 1. */
    defaultValue: integer('default_value').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('character_resources_run_id_key').on(t.runId, t.id),
    unique('character_resources_unique').on(t.runId, t.characterId, t.resourceId),
    unique('character_resources_external_key').on(t.runId, t.externalId),
    foreignKey({
      name: 'character_resources_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'character_resources_resource_fk',
      columns: [t.runId, t.resourceId],
      foreignColumns: [resources.runId, resources.id],
    }).onDelete('restrict'),
  ],
)

/**
 * The joint account's starting balance (§4.2) — a `Resources` row whose owner
 * is a household ID (`MarieMirek`) instead of a character.
 *
 * Only a household from the `Household` column of `Characters` may have one,
 * and every such household must (§11, bod 7): an opening balance is never
 * filled in with a quiet zero.
 */
export const householdResources = pgTable(
  'household_resources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    householdId: uuid('household_id').notNull(),
    resourceId: uuid('resource_id').notNull(),
    /** Full ID from the source spreadsheet, e.g. `R_MarieMirek_Wealth`. */
    externalId: text('external_id').notNull(),
    /** Starting value for chapter 1. */
    defaultValue: integer('default_value').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('household_resources_run_id_key').on(t.runId, t.id),
    unique('household_resources_unique').on(t.runId, t.householdId, t.resourceId),
    unique('household_resources_external_key').on(t.runId, t.externalId),
    foreignKey({
      name: 'household_resources_household_fk',
      columns: [t.runId, t.householdId],
      foreignColumns: [households.runId, households.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'household_resources_resource_fk',
      columns: [t.runId, t.resourceId],
      foreignColumns: [resources.runId, resources.id],
    }).onDelete('restrict'),
  ],
)
