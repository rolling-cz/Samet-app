import {
  foreignKey,
  integer,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { createdAt } from './columns'
import { runs } from './runs'

/**
 * Group / organisation / gang (§4.1), from the `Groups` sheet (§4.2).
 *
 * Members and leadership are not here: they change per chapter and live in
 * `group_memberships` as a snapshot. The sheet's member and leader columns are
 * the chapter-1 starting state.
 */
export const groups = pgTable(
  'groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** ID from the source spreadsheet, e.g. `G_SrdceParty`. */
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
 * resources and membership is modelled — characterisation lives in fixed
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
    /** Default group from config; current membership is in `group_memberships`. */
    homeGroupId: uuid('home_group_id'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('characters_run_id_key').on(t.runId, t.id),
    unique('characters_run_external_key').on(t.runId, t.externalId),
    foreignKey({
      name: 'characters_home_group_fk',
      columns: [t.runId, t.homeGroupId],
      foreignColumns: [groups.runId, groups.id],
    }).onDelete('restrict'),
  ],
)
