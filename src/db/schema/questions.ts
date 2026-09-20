import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { authorName, createdAt } from './columns'
import { questionSource, questionType } from './enums'
import { characters } from './characters'
import { blockVariations } from './content'
import { scales } from './scales'
import { resources } from './resources'
import { chapters, runs } from './runs'

/**
 * Question (§6.1, §6.6). Questions are per character — there is no shared set.
 *
 * The one exception is a `poll`: an opinion poll belongs to no character and
 * carries only its text and options, while each voting character has a
 * `poll-answer` pointing at it through `pollQuestionId` (§6.6). That is why
 * `characterId` and `ordinal` are nullable — a poll has neither, and counts
 * towards nobody's question order.
 *
 * The questionnaire is flat: conditional sub-questions are deliberately out.
 * A whole question may still wait for a block variant — see
 * `conditionVariationId`.
 *
 * `source` separates player questions from org ones (§6.7) — a different input
 * source, not a different mechanism: same types, same impacts, same rules, one
 * stream in the UI and one progress indicator.
 */
export const questions = pgTable(
  'questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /**
     * Source ID `Q_<Postava>_<Kapitola>_<Poradi>`, e.g. `Q_Marie_1_1`. The
     * author may leave the cell empty and the import derives it (§4.2); for a
     * `poll` it is mandatory and never generated.
     */
    externalId: text('external_id').notNull(),
    chapterId: uuid('chapter_id').notNull(),
    /** NULL for a `poll`, which belongs to no character. */
    characterId: uuid('character_id'),
    /** Order within the character's chapter, from 1; NULL for a `poll`. */
    ordinal: integer('ordinal'),
    type: questionType('type').notNull(),
    /** Who fills it in (§6.7); `org` is not printed for players. */
    source: questionSource('source').notNull().default('player'),
    /**
     * The poll this vote belongs to (§6.6). Text and options are taken from it,
     * so nothing is copied per voting character and the options have one source.
     */
    pollQuestionId: uuid('poll_question_id'),
    /**
     * The `Condition` column (§4.5): the question is asked only when this
     * variant was selected for its character; NULL means always. A reference,
     * not an expression — expressions live in `block_variations` only. That the
     * variant is the same character's and the same chapter's is the import's
     * check, the key only makes sure it exists in this run.
     */
    conditionVariationId: uuid('condition_variation_id'),
    /**
     * The `Private` flag (§4.4): every impact of this question goes to the
     * personal account even when the character is married. Income the partner
     * does not know about.
     */
    isPrivate: boolean('is_private').notNull().default(false),
    /** Empty for a `poll-answer`, which shows its poll's text. */
    text: text('text').notNull().default(''),
    helpText: text('help_text'),
    /** Target of `scale_direct`; must name a concrete scale (§4.4). */
    targetScaleId: uuid('target_scale_id'),
    /** Target of `resource_direct`; must name a concrete account (§4.4). */
    targetResourceId: uuid('target_resource_id'),
    /** Allows `_OTHER_`: free text the org fills in by hand (§4.2). */
    allowOther: boolean('allow_other').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    unique('questions_run_id_key').on(t.runId, t.id),
    unique('questions_run_external_key').on(t.runId, t.externalId),
    unique('questions_character_ordinal_key').on(
      t.runId,
      t.chapterId,
      t.characterId,
      t.ordinal,
    ),
    // A poll has no owner and no place in anyone's order; everything else has both.
    check(
      'questions_poll_has_no_character',
      sql`(${t.type} = 'poll') = (${t.characterId} is null and ${t.ordinal} is null)`,
    ),
    // Only a vote points at a poll, and a vote without one has nothing to show.
    check(
      'questions_poll_answer_needs_poll',
      sql`(${t.type} = 'poll-answer') = (${t.pollQuestionId} is not null)`,
    ),
    check(
      'questions_scale_direct_needs_scale',
      sql`(${t.type} = 'scale_direct') = (${t.targetScaleId} is not null)`,
    ),
    check(
      'questions_resource_direct_needs_resource',
      sql`(${t.type} = 'resource_direct') = (${t.targetResourceId} is not null)`,
    ),
    foreignKey({
      name: 'questions_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'questions_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'questions_poll_fk',
      columns: [t.runId, t.pollQuestionId],
      foreignColumns: [t.runId, t.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'questions_condition_variation_fk',
      columns: [t.runId, t.conditionVariationId],
      foreignColumns: [blockVariations.runId, blockVariations.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'questions_target_scale_fk',
      columns: [t.runId, t.targetScaleId],
      foreignColumns: [scales.runId, scales.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'questions_target_resource_fk',
      columns: [t.runId, t.targetResourceId],
      foreignColumns: [resources.runId, resources.id],
    }).onDelete('restrict'),
  ],
)

/**
 * An answer option of a `single` / `multi` question (§4.2).
 *
 * Options often name other characters, and the reference must be a registry ID
 * rather than free text — otherwise a marriage or rename breaks the link
 * (§6.6). Hence `referencedCharacterId`.
 *
 * Scale impacts live in the `effects` table, not in a text column.
 */
export const answerOptions = pgTable(
  'answer_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    /** `A_<Postava>_<Kapitola>_<Otazka>_<Hodnota>`, e.g. `A_Marie_1_1_Karel`. */
    externalId: text('external_id').notNull(),
    questionId: uuid('question_id').notNull(),
    ordinal: integer('ordinal').notNull(),
    label: text('label').notNull(),
    /** Set when the option names another character. */
    referencedCharacterId: uuid('referenced_character_id'),
    /** The `_OTHER_` option: the org adds free text to it (§4.2). */
    isOther: boolean('is_other').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    unique('answer_options_run_id_key').on(t.runId, t.id),
    unique('answer_options_run_external_key').on(t.runId, t.externalId),
    unique('answer_options_question_ordinal_key').on(t.runId, t.questionId, t.ordinal),
    foreignKey({
      name: 'answer_options_question_fk',
      columns: [t.runId, t.questionId],
      foreignColumns: [questions.runId, questions.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'answer_options_referenced_character_fk',
      columns: [t.runId, t.referencedCharacterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
  ],
)

/**
 * A character's answer in a chapter (§6.3).
 *
 * There are no default answers: a row means someone entered it explicitly, and
 * a missing row blocks the computation. Nothing is ever filled in silently.
 *
 * The value is held per question type in `boolValue`, `numericValue` or
 * `textValue`; `single` / `multi` use `answer_selected_options`.
 *
 * Answers are edited in place (autosave, §6.4); `audit_log` holds the history.
 */
export const answers = pgTable(
  'answers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    chapterId: uuid('chapter_id').notNull(),
    characterId: uuid('character_id').notNull(),
    questionId: uuid('question_id').notNull(),

    boolValue: boolean('bool_value'),
    numericValue: integer('numeric_value'),
    /** Free text for type `text`, or the text added to `_OTHER_`. */
    textValue: text('text_value'),

    /** Entered by the org, not the player (§6.3) — so it can be told apart later. */
    filledByOrg: boolean('filled_by_org').notNull().default(false),
    answeredBy: authorName('answered_by'),
    answeredAt: timestamp('answered_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('answers_unique').on(t.runId, t.chapterId, t.characterId, t.questionId),
    unique('answers_run_id_key').on(t.runId, t.id),
    foreignKey({
      name: 'answers_chapter_fk',
      columns: [t.runId, t.chapterId],
      foreignColumns: [chapters.runId, chapters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'answers_character_fk',
      columns: [t.runId, t.characterId],
      foreignColumns: [characters.runId, characters.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'answers_question_fk',
      columns: [t.runId, t.questionId],
      foreignColumns: [questions.runId, questions.id],
    }).onDelete('restrict'),
  ],
)

/** Selected options: one row for `single`, several for `multi`. */
export const answerSelectedOptions = pgTable(
  'answer_selected_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    answerId: uuid('answer_id').notNull(),
    answerOptionId: uuid('answer_option_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('answer_selected_options_unique').on(t.runId, t.answerId, t.answerOptionId),
    foreignKey({
      name: 'answer_selected_options_answer_fk',
      columns: [t.runId, t.answerId],
      foreignColumns: [answers.runId, answers.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'answer_selected_options_option_fk',
      columns: [t.runId, t.answerOptionId],
      foreignColumns: [answerOptions.runId, answerOptions.id],
    }).onDelete('restrict'),
  ],
)

/**
 * The numbers the org typed into an answer's `{input}` fields (§4.4) — how much
 * each spouse puts into the joint account, or takes out of it.
 *
 * Part of the answer, like `numericValue` of a `scale_direct`: entered once in
 * the questionnaire and read by every computation after it, and after the game
 * it says who brought what. `effect_inputs` only describes the fields.
 *
 * Tied to the answer and the option, not to `answer_selected_options`: a
 * marriage is a `bool` question, which stores no selected options.
 */
export const answerInputValues = pgTable(
  'answer_input_values',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'restrict' }),
    answerId: uuid('answer_id').notNull(),
    answerOptionId: uuid('answer_option_id').notNull(),
    /** Placeholder name as written, without braces: `input1`. */
    inputKey: text('input_key').notNull(),
    value: integer('value').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('answer_input_values_unique').on(t.runId, t.answerId, t.answerOptionId, t.inputKey),
    foreignKey({
      name: 'answer_input_values_answer_fk',
      columns: [t.runId, t.answerId],
      foreignColumns: [answers.runId, answers.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'answer_input_values_option_fk',
      columns: [t.runId, t.answerOptionId],
      foreignColumns: [answerOptions.runId, answerOptions.id],
    }).onDelete('restrict'),
  ],
)
