import { foreignKey, integer, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core'
import { createdAt } from './columns'
import { households } from './households'
import { runs } from './runs'

/**
 * Group / organisation / gang (§4.1), from the `Groups` sheet (§4.2).
 *
 * ID and name, nothing else: who belongs to a group and who leads it is not
 * state (§4.6) — block variants and their conditions say it. The registry is
 * here so the import can check that every group has a template (§10.2, §11).
 */
export const groups = pgTable(
  'groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** ID from the source spreadsheet, e.g. `SrdceParty`. */
    externalId: text('external_id').notNull(),
    name: text('name').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('groups_run_id_key').on(t.runId, t.id),
    unique('groups_run_external_key').on(t.runId, t.externalId),
  ],
)

/**
 * A character in a run (§4.2). A minimal registry: nothing beyond scales,
 * resources and the household is modelled — characterisation lives in fixed
 * template text, which is not a data model (§4.6).
 *
 * Starting values do not live here: they are in the `Scales` and `Resources`
 * sheets, per pair of character × scale / resource (§4.2).
 *
 * `firstName` / `lastName` are the config defaults. Marriage changes the
 * surname, so texts never hardcode a name and the current value comes from
 * `character_variables` for the given chapter.
 */
export const characters = pgTable(
  'characters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** ID from the `Characters` sheet, e.g. `Marie`; feeds the question ID convention. */
    externalId: text('external_id').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    /** Birth year, used to compute `{VEK}` in each chapter. */
    birthYear: integer('birth_year'),
    /**
     * Household the character starts chapter 1 in — the `Household` column of
     * `Characters` (§4.2). NULL means they start single. Membership from
     * chapter 2 on is a snapshot in `household_memberships`.
     */
    defaultHouseholdId: uuid('default_household_id'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('characters_run_id_key').on(t.runId, t.id),
    unique('characters_run_external_key').on(t.runId, t.externalId),
    foreignKey({
      name: 'characters_default_household_fk',
      columns: [t.runId, t.defaultHouseholdId],
      foreignColumns: [households.runId, households.id],
    }).onDelete('restrict'),
  ],
)
