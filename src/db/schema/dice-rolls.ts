import { sql } from 'drizzle-orm'
import { boolean, check, foreignKey, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { authorName } from './columns'
import { blockVariations } from './content'
import { runs } from './runs'

/**
 * A dice roll (§7.4). Rolled once and stored, exactly like a player's answer.
 *
 * A roll belongs to the variant, not to a character and a chapter: the
 * variant's block says whose it is — a character's or a group's — and which
 * chapter's documents it fills, so neither is stored a second time and a group
 * block's roll has somewhere to go.
 *
 * `occurrence` distinguishes several `RANDOM(n)` calls inside one condition,
 * counted left to right from 0 — without it two rolls in one expression would
 * collide on the unique.
 *
 * Recomputation never re-rolls; only an explicit org action can, keeping the old
 * number in `previousValue` and the whole change in the audit.
 *
 * A table of its own rather than a column on `answers`, because a roll belongs
 * to a condition, not to a question.
 */
export const diceRolls = pgTable(
  'dice_rolls',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    blockVariationId: uuid('block_variation_id').notNull(),
    /** Index of the `RANDOM(...)` call within the variant's condition, from 0. */
    occurrence: integer('occurrence').notNull().default(0),
    sides: integer('sides').notNull(),
    value: integer('value').notNull(),
    /** Value before a re-roll or a manual override. */
    previousValue: integer('previous_value'),
    /** The org typed the number in; it was not rolled. */
    isManualOverride: boolean('is_manual_override').notNull().default(false),
    rerollCount: integer('reroll_count').notNull().default(0),
    rolledAt: timestamp('rolled_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    rolledBy: authorName('rolled_by'),
    reason: text('reason'),
  },
  (t) => [
    unique('dice_rolls_unique').on(t.runId, t.blockVariationId, t.occurrence),
    check('dice_rolls_value_in_range', sql`${t.value} between 1 and ${t.sides}`),
    check('dice_rolls_sides_sane', sql`${t.sides} >= 2`),
    foreignKey({
      name: 'dice_rolls_variation_fk',
      columns: [t.runId, t.blockVariationId],
      foreignColumns: [blockVariations.runId, blockVariations.id],
    }).onDelete('restrict'),
  ],
)
