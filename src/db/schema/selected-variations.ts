import { foreignKey, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core'
import { createdAt } from './columns'
import { computations } from './computations'
import { blockVariations, contentBlocks } from './content'
import { runs } from './runs'

/**
 * The variant a computation selected for a block (§4.3, §8.2).
 *
 * Selected variants are state, not a by-product of the documents: they fill the
 * document (§8.3), decide which questions of the chapter are asked (§4.5) and
 * are part of the audit. Like every snapshot they carry `computation_id` and
 * are never overwritten.
 *
 * Owner and chapter are the block's: `content_blocks` says whose block it is
 * and which chapter's documents and questionnaire it belongs to (`2_Content` →
 * chapter 2). Computing chapter N decides the blocks of chapter N+1, so they are
 * known before that questionnaire opens.
 *
 * A computation stores the **whole run's** selection so far, not only the blocks
 * it decided itself: the next chapter starts from this snapshot alone, and the
 * engine needs every earlier selection to tell which questions were asked
 * (`RunState.selectedVariants`, §4.5). Still one variant per block.
 *
 * A block left undecided by a missing roll (§7.4) has no row here.
 */
export const selectedVariations = pgTable(
  'selected_variations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    computationId: uuid('computation_id').notNull(),
    blockId: uuid('block_id').notNull(),
    blockVariationId: uuid('block_variation_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    // A block returns exactly one variant (§8.2).
    unique('selected_variations_unique').on(t.runId, t.computationId, t.blockId),
    foreignKey({
      name: 'selected_variations_computation_fk',
      columns: [t.runId, t.computationId],
      foreignColumns: [computations.runId, computations.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'selected_variations_block_fk',
      columns: [t.runId, t.blockId],
      foreignColumns: [contentBlocks.runId, contentBlocks.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'selected_variations_variation_fk',
      columns: [t.runId, t.blockId, t.blockVariationId],
      foreignColumns: [blockVariations.runId, blockVariations.blockId, blockVariations.id],
    }).onDelete('restrict'),
  ],
)
