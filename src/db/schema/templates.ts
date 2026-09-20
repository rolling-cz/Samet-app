import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  jsonb,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { authorName, createdAt } from './columns'
import { templateKind } from './enums'
import { characters, groups } from './characters'
import { chapters, runs } from './runs'

/**
 * A document template: Markdown exported from a Google Doc (§8.3, §10.2).
 *
 * The template carries only unpaired markers — `{BLOK <ID>}` plus variables;
 * variant text lives in `block_variations` (§8.2, §8.4). There is no `{/BLOK}`
 * to close, and no marker may survive into the finished document.
 *
 * Who a template belongs to comes from the **file name**, `<ID>_<kapitola>.md`
 * (§10.2) — `Marie_2.md`, `Funkcionari_2.md`. All three chapters are uploaded
 * at the start of the run.
 *
 * One template per (chapter, kind, character/group): a run has one valid
 * config (§6.5), and the uploaded file itself is kept in `uploaded_files`.
 *
 * `parsedBlocks` is the parse result from upload, feeding the §11 validations
 * (a block nothing can reach, a block the engine expects but the template lacks).
 */
export const templates = pgTable(
  'templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    chapterId: uuid('chapter_id').notNull(),
    kind: templateKind('kind').notNull(),
    /** Set when `kind = 'postava'`. */
    characterId: uuid('character_id'),
    /** Set when `kind = 'skupina'`. */
    groupId: uuid('group_id'),
    name: text('name').notNull(),
    sourceFilename: text('source_filename').notNull(),
    markdown: text('markdown').notNull(),
    /** Found `{BLOK ID}` and `{PROMENNA}` markers plus any marker problems. */
    parsedBlocks: jsonb('parsed_blocks'),
    createdAt: createdAt(),
    createdBy: authorName('created_by'),
  },
  (t) => [
    unique('templates_run_id_key').on(t.runId, t.id),
    // NULL targets of the other kinds never collide in a plain unique.
    unique('templates_character_key').on(t.runId, t.chapterId, t.characterId),
    unique('templates_group_key').on(t.runId, t.chapterId, t.groupId),
    uniqueIndex('templates_singleton')
      .on(t.runId, t.chapterId, t.kind)
      .where(sql`${t.kind} = 'dotaznik'`),
    check(
      'templates_target_matches_kind',
      sql`case ${t.kind}
            when 'postava' then ${t.characterId} is not null and ${t.groupId} is null
            when 'skupina' then ${t.groupId} is not null and ${t.characterId} is null
            else ${t.characterId} is null and ${t.groupId} is null
          end`,
    ),
    foreignKey({
      name: 'templates_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'templates_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'templates_group_fk',
      columns: [t.runId, t.groupId],
      foreignColumns: [groups.runId, groups.id],
    }).onDelete('restrict'),
  ],
)
