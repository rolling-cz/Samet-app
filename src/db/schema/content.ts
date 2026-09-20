import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { createdAt } from './columns'
import { characters, groups } from './characters'
import { chapters, runs } from './runs'

/**
 * A template block from the `N_Content` sheet (§8.2) — the thing a
 * `{BLOK <ID>}` marker stands for.
 *
 * Variants live here rather than in the template (§8.2): the template carries
 * only the marker, so the author edits text in the spreadsheet and never
 * touches the document.
 *
 * A block belongs to a character or to a group — the `Character` column holds
 * either (§8.2).
 */
export const contentBlocks = pgTable(
  'content_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** `Block ID` from the sheet, e.g. `B_Marie_2_Historie_1`. */
    externalId: text('external_id').notNull(),
    chapterId: uuid('chapter_id').notNull(),
    characterId: uuid('character_id'),
    groupId: uuid('group_id'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('content_blocks_run_id_key').on(t.runId, t.id),
    unique('content_blocks_run_external_key').on(t.runId, t.externalId),
    check(
      'content_blocks_exactly_one_owner',
      sql`(${t.characterId} is not null) <> (${t.groupId} is not null)`,
    ),
    foreignKey({
      name: 'content_blocks_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'content_blocks_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'content_blocks_group_fk',
      columns: [t.runId, t.groupId],
      foreignColumns: [groups.runId, groups.id],
    }).onDelete('restrict'),
  ],
)

/**
 * One variant of a block (§8.2). Variants are walked in ascending `priority`
 * and the first whose condition holds wins, so ordering decides completely and
 * no conflict between variants can arise.
 *
 * `priority` is optional: when no variant of a block has one, `ordinal` (the
 * row order in the sheet) decides instead. That is the author saying "read them
 * top to bottom". Partially filled priorities are a validation error, because
 * the order would be ambiguous (§11, 6h).
 *
 * `conditionExpr` stays as the author's text (§4.5): conditions are expressions
 * in one cell, parsed with `jsep`, not spread into structured columns. Keeping
 * the source text means a validation message can quote what the author wrote.
 * `conditionRefs` caches the identifiers the expression mentions, so
 * cross-reference checks do not re-parse.
 *
 * An empty `conditionExpr` and `DEFAULT` mean the same thing — the always-true
 * fallback, which therefore has to stand last (§8.2).
 *
 * `text` may be empty — the "nothing happened" variant, whose marker vanishes
 * without a trace. It may itself contain a `{BLOK …}` marker: blocks nest and
 * are substituted in a loop (§8.4).
 */
export const blockVariations = pgTable(
  'block_variations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** `Variation ID`, e.g. `V_Marie_2_Historie_1_A`. */
    externalId: text('external_id').notNull(),
    blockId: uuid('block_id').notNull(),
    /** Row order within the block, from 1; the fallback when no priority is set. */
    ordinal: integer('ordinal').notNull(),
    /** Lower runs first (§8.2); NULL when the block orders by rows. */
    priority: integer('priority'),
    /** The author's note; never reaches the document. */
    description: text('description'),
    text: text('text').notNull().default(''),
    /** Raw expression; empty or `DEFAULT` is the always-true fallback. */
    conditionExpr: text('condition_expr').notNull().default(''),
    /** Identifiers found in the expression, for the §11 cross-checks. */
    conditionRefs: jsonb('condition_refs'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('block_variations_run_id_key').on(t.runId, t.id),
    unique('block_variations_run_external_key').on(t.runId, t.externalId),
    unique('block_variations_block_ordinal_key').on(t.runId, t.blockId, t.ordinal),
    // Two variants of one block with the same priority would make the result
    // depend on row order (§11, 6e). Partial, because "no priority at all" is
    // a legitimate way to order a block and a plain unique cannot express that.
    uniqueIndex('block_variations_block_priority_key')
      .on(t.runId, t.blockId, t.priority)
      .where(sql`${t.priority} is not null`),
    foreignKey({
      name: 'block_variations_block_fk',
      columns: [t.runId, t.blockId],
      foreignColumns: [contentBlocks.runId, contentBlocks.id],
    }).onDelete('restrict'),
  ],
)
