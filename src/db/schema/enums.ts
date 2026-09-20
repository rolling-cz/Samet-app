import { pgEnum } from 'drizzle-orm/pg-core'

/** Run lifecycle (§3.2). */
export const runStatus = pgEnum('run_status', ['zalozen', 'aktivni', 'archivovan'])

/** Chapter states (§3.2). None of them is an irreversible lock. */
export const chapterStatus = pgEnum('chapter_status', ['rozpracovana', 'spocitana', 'vydana'])

/** Org's decision about a touched chapter (cascade, §3.2). */
export const cascadeDecision = pgEnum('cascade_decision', ['prepocitat', 'ponechat'])

/**
 * Question types (§6.1). Spelled as the author writes them in the sheet.
 *
 * `poll` is an opinion poll shared by several characters and `poll-answer` is
 * one character's vote in it (§6.6). `scale_direct` / `resource_direct` set a
 * value absolutely and must always name a concrete account (§4.4).
 *
 * Conditional sub-questions are deliberately out — the questionnaire is flat.
 */
export const questionType = pgEnum('question_type', [
  'bool',
  'single',
  'multi',
  'poll',
  'poll-answer',
  'scale_direct',
  'resource_direct',
])

/**
 * Who fills the question in (§6.7). `org` is not printed into the player's
 * questionnaire; otherwise it behaves identically — a different input source,
 * not a different mechanism, and the engine does not tell them apart.
 */
export const questionSource = pgEnum('question_source', ['hrac', 'org'])

/**
 * Where a resource's value lives (§4.4). `private` belongs to one character;
 * `household` means the resource also has a joint account, and an unsuffixed
 * impact is routed to one or the other by marital status.
 */
export const resourceScope = pgEnum('resource_scope', ['private', 'household'])

/**
 * Which account an impact aims at (§4.4).
 *
 * `smerovany` is the plain `R_Marie_Wealth` form the author writes most of the
 * time — the engine picks the account after the structural phase. The other two
 * are the escape hatches: `_private` in the sheet, and a household ID written
 * out in full.
 */
export const resourceTarget = pgEnum('resource_target', ['smerovany', 'osobni', 'domacnost'])

/**
 * Effect kind (§7.1, §4.4). Scales and resources are separate on purpose.
 *
 * Group membership and leadership are deliberately absent: they are not state,
 * block variants and their conditions express them (§4.6).
 */
export const effectKind = pgEnum('effect_kind', [
  'zmena_skaly',
  'nastaveni_skaly',
  'zmena_zdroje',
  'nastaveni_zdroje',
  'blok',
  'domacnost_vznik',
  'domacnost_zanik',
])

/** Where a character state value came from. */
export const stateSource = pgEnum('state_source', ['pocatecni', 'prepocet', 'rucni'])

/** A computation version comes from the engine or from a manual edit (§5.6). */
export const computationKind = pgEnum('computation_kind', ['prepocet', 'rucni_uprava'])

/** `navrh` is a dry-run (§5.4); documents are generated from a confirmed one. */
export const computationStatus = pgEnum('computation_status', ['navrh', 'potvrzena'])

/** What an archived upload holds (§6.5). */
export const uploadKind = pgEnum('upload_kind', ['konfigurace', 'sablona'])

/** Document template kind (§8.6). */
export const templateKind = pgEnum('template_kind', ['postava', 'skupina', 'dotaznik'])
