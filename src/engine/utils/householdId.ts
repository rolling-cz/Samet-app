/**
 * A household's ID is both members' IDs sorted alphabetically and glued
 * together — `MarieMirek`, never `MirekMarie` (§4.2).
 *
 * It is stored nowhere and derived everywhere: the same pair always yields the
 * same ID, even after a divorce and a second marriage, so the author can name
 * the joint account before the household exists.
 *
 * The comparison is deliberately plain, not locale-aware: registry IDs are
 * ASCII (`Marie`, `Mirek`), and a collation that differs between environments
 * would make the same pair produce two different accounts.
 */
export const householdExternalId = (first: string, second: string): string =>
  first <= second ? `${first}${second}` : `${second}${first}`
