import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  integer,
  numeric,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { createdAt } from './columns'
import { effectKind, groupRole, membershipAction, resourceTarget } from './enums'
import { characters, groups } from './characters'
import { scales } from './scales'
import { resources } from './resources'
import { answerOptions } from './questions'
import { runs } from './runs'

/**
 * What an answer does (§4.5, layers 1 and 2) — the `Scale and Resources Impact`
 * and `Effects` columns of `N_Questions`, decomposed into rows.
 *
 * The owner is always an answer option. The revised spec knows no separate rule
 * sheet: everything that changes state hangs off an answer, and the engine
 * handles all of it with one code path.
 */
export const effects = pgTable(
  'effects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),

    answerOptionId: uuid('answer_option_id').notNull(),
    ordinal: integer('ordinal').notNull().default(0),

    /**
     * Deterministic ID derived from the owner and the ordinal
     * (`A_Marie_1_1_Karel#0`). Effects have no ID in the source sheet, but a
     * re-import has to update them rather than add a second copy.
     */
    externalId: text('external_id').notNull(),

    kind: effectKind('kind').notNull(),
    /** Effect weight (§7.2); the result is a sum of weighted contributions. */
    weight: numeric('weight', { precision: 8, scale: 3 }).notNull().default('1'),

    /** NULL means the character being computed. */
    characterId: uuid('character_id'),

    /** `zmena_skaly` / `nastaveni_skaly`; always a concrete character's scale. */
    scaleId: uuid('scale_id'),
    scaleDelta: integer('scale_delta'),
    scaleSetValue: integer('scale_set_value'),

    /** `zmena_zdroje` / `nastaveni_zdroje`. */
    resourceId: uuid('resource_id'),
    resourceDelta: integer('resource_delta'),
    resourceSetValue: integer('resource_set_value'),
    /**
     * Which account the impact lands on (§4.4). `smerovany` is the plain
     * `R_Marie_Wealth` form, decided after the structural phase; the trace must
     * always say which account won and why.
     */
    resourceTarget: resourceTarget('resource_target'),
    /** Household written out in the sheet, e.g. `MarieMirek`; with `domacnost`. */
    householdExternalId: text('household_external_id'),

    /** `blok`: template block ID, `{BLOK <ID>}` (§8.4). */
    blockExternalId: text('block_external_id'),

    /** `clenstvi` / `vedeni`. */
    groupId: uuid('group_id'),
    membershipAction: membershipAction('membership_action'),
    groupRole: groupRole('group_role'),

    /**
     * The effect's second character — a target derived from the answer (§7.3).
     * Needed by `domacnost_slouceni` (the spouse), `vedeni` (who became leader)
     * and `clenstvi` (who to add or remove).
     *
     * `relatedCharacterId` names the character outright; `relatedFromAnswer`
     * takes whoever the chosen option references
     * (`answer_options.referenced_character_id`). The second path is what saves
     * the author from writing an answer per pair of 23 characters.
     */
    relatedCharacterId: uuid('related_character_id'),
    relatedFromAnswer: boolean('related_from_answer').notNull().default(false),

    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('effects_run_id_key').on(t.runId, t.id),
    unique('effects_run_external_key').on(t.runId, t.externalId),
    // The second character is named or derived, never both.
    check(
      'effects_related_single_source',
      sql`not (${t.relatedCharacterId} is not null and ${t.relatedFromAnswer})`,
    ),
    // A household merge cannot work without the second character.
    check(
      'effects_merge_needs_related',
      sql`${t.kind} <> 'domacnost_slouceni' or ${t.relatedCharacterId} is not null or ${t.relatedFromAnswer}`,
    ),
    // Routing is a property of a resource impact and of nothing else.
    check(
      'effects_target_only_on_resources',
      sql`(${t.kind} in ('zmena_zdroje', 'nastaveni_zdroje')) = (${t.resourceTarget} is not null)`,
    ),
    foreignKey({
      name: 'effects_option_fk',
      columns: [t.runId, t.answerOptionId],
      foreignColumns: [answerOptions.runId, answerOptions.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'effects_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'effects_related_character_fk',
      columns: [t.runId, t.relatedCharacterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'effects_scale_fk',
      columns: [t.runId, t.scaleId],
      foreignColumns: [scales.runId, scales.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'effects_resource_fk',
      columns: [t.runId, t.resourceId],
      foreignColumns: [resources.runId, resources.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'effects_group_fk',
      columns: [t.runId, t.groupId],
      foreignColumns: [groups.runId, groups.id],
    }).onDelete('restrict'),
  ],
)

/**
 * The `{input}` placeholders of one effect (§4.4).
 *
 * How much each partner puts into the joint account is never computed — the org
 * types it in. The author writes it as a named placeholder
 * (`R_Antonin_Wealth-{input}, R_AntoninMarketa_Wealth+{input}`), the same name
 * meaning the same number everywhere in that answer, so one input field feeds
 * both sides of a transfer.
 *
 * The effect's magnitude is the signed sum of its inputs; with no rows the
 * literal delta or set value applies.
 */
export const effectInputs = pgTable(
  'effect_inputs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    effectId: uuid('effect_id').notNull(),
    ordinal: integer('ordinal').notNull(),
    /** Placeholder name as written, without braces: `input`, `input1`. */
    inputKey: text('input_key').notNull(),
    /** `+1` or `-1` — which way the typed number moves this account. */
    sign: integer('sign').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('effect_inputs_unique').on(t.runId, t.effectId, t.ordinal),
    check('effect_inputs_sign', sql`${t.sign} in (1, -1)`),
    foreignKey({
      name: 'effect_inputs_effect_fk',
      columns: [t.runId, t.effectId],
      foreignColumns: [effects.runId, effects.id],
    }).onDelete('restrict'),
  ],
)
