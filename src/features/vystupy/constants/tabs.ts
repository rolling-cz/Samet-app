/**
 * The tab is a view, not an identity: run, chapter and character are in the
 * path, the tab is a search parameter (§6.4).
 */
export const TAB_PARAM = 'zalozka'

export const OUTPUT_TABS = Object.freeze(['prehled', 'dokumenty'] as const)

export type OutputTab = (typeof OUTPUT_TABS)[number]

const DEFAULT_OUTPUT_TAB: OutputTab = 'prehled'

export const parseOutputTab = (value: string | string[] | undefined): OutputTab =>
  (OUTPUT_TABS as readonly string[]).includes(String(value)) ? (value as OutputTab) : DEFAULT_OUTPUT_TAB
