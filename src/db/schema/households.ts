import { foreignKey, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core'
import { createdAt } from './columns'
import { stateSource } from './enums'
import { chapters, runs } from './runs'

/**
 * Household (§4.4) — characters sharing money, i.e. spouses.
 *
 * `externalId` is not taken from any sheet: it is both characters' IDs sorted
 * alphabetically and glued together (`MarieMirek`, never `MirekMarie`). The
 * same pair therefore always yields the same ID, even after a divorce and a
 * second marriage, and an author can write `R_MarieMirek_Wealth` before the
 * household exists.
 *
 * A single character is NOT a household of one (§4.4): their money stays on
 * their personal account and routing decides which of the two an impact hits.
 *
 * A household either starts the game — the `Household` column of `Characters`
 * (§4.2) — or is created in play by `HOUSEHOLD_CREATE`; `createdInChapterId`
 * says which, and a default one belongs to chapter 1.
 *
 * The household's identity survives chapters; who belongs to it is a
 * per-chapter snapshot in `household_memberships`. A divorce therefore deletes
 * nothing, it just produces different membership in the next chapter.
 */
export const households = pgTable(
  'households',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** Derived from the member IDs, e.g. `MarieMirek` (§4.2). */
    externalId: text('external_id').notNull(),
    /** For the org only; never enters documents. */
    label: text('label'),
    createdInChapterId: uuid('created_in_chapter_id').notNull(),
    /**
     * `initial` comes from the `Household` column, `computation` was founded in
     * play. Only the first kind is config: a re-import must not take a marriage
     * for an entity the sheet dropped.
     */
    source: stateSource('source').notNull().default('initial'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('households_run_id_key').on(t.runId, t.id),
    unique('households_run_external_key').on(t.runId, t.externalId),
    foreignKey({
      name: 'households_chapter_fk',
      columns: [t.runId, t.createdInChapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
  ],
)
