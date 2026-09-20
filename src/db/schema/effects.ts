import { sql } from 'drizzle-orm'
import {
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
import { effectKind, resourceTarget } from './enums'
import { characters } from './characters'
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

    /**
     * NULL means the character being computed. A household effect always names
     * it: it is the first argument of `HOUSEHOLD_CREATE(A, B)` (§4.4).
     */
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

    /**
     * The second member of `HOUSEHOLD_CREATE(A, B)` / `HOUSEHOLD_DELETE(A, B)`;
     * `characterId` holds the first (§4.4). Both arguments are registry IDs the
     * author writes out, so nothing is inferred from the answer text.
     */
    relatedCharacterId: uuid('related_character_id'),

    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('effects_run_id_key').on(t.runId, t.id),
    unique('effects_run_external_key').on(t.runId, t.externalId),
    // A household is a pair; neither its creation nor its end means anything
    // with one member missing.
    check(
      'effects_household_needs_two',
      sql`${t.kind} not in ('domacnost_vznik', 'domacnost_zanik')
          or (${t.characterId} is not null and ${t.relatedCharacterId} is not null)`,
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
  ],
)

/**
 * The `{input}` placeholders of one effect (§4.4).
 *
 * How much each partner puts into the joint account is never computed — the org
 * types it in. A household effect derives its own placeholders (`{input1}` for
 * the first member, `{input2}` for the second); elsewhere the author writes
 * them by hand. The same name means the same number everywhere in that answer,
 * so one input field feeds both sides of a transfer.
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
