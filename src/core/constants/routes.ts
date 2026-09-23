import type { Route } from 'next'

/** Entry screen: pick or create a run (§3.2). */
export const HOME_ROUTE = '/'

/** Shared-password screen (§3.1); the only route the access check lets through. */
export const LOGIN_ROUTE = '/prihlaseni'

/** Query parameter carrying where to return after logging in. */
export const RETURN_PATH_PARAM = 'dal'

/** Sections that show one chapter's data; their path carries the chapter. */
export const CHAPTER_SECTIONS = Object.freeze(['postavy', 'skupiny', 'prepocet', 'vystupy'] as const)

export type ChapterSection = (typeof CHAPTER_SECTIONS)[number]

/** Config, archive and audit belong to the run, so Správa has no chapter in its path. */
export const ADMIN_SECTION = 'sprava'

/** The five sections of the top bar, in display order (§6.4). */
export const RUN_SECTIONS = Object.freeze([...CHAPTER_SECTIONS, ADMIN_SECTION] as const)

export type RunSection = (typeof RUN_SECTIONS)[number]

/** Where opening a run or a chapter lands — transcribing questionnaires is the everyday work. */
export const DEFAULT_CHAPTER_SECTION: ChapterSection = 'postavy'

/** Path segment in front of the chapter number: `/beh/<runId>/kapitola/<n>/…`. */
export const CHAPTER_SEGMENT = 'kapitola'

/**
 * The run lives in the URL path, not in a cookie: two tabs may each hold a
 * different run, and a cookie shared by both would silently switch one of them.
 * The chapter and the selected character are in the path for the same reason.
 */
export const runPath = (runId: string): string => `/beh/${encodeURIComponent(runId)}`

// typedRoutes cannot follow runtime IDs; the shapes below match the tree under `app/beh/[runId]`.

/** Redirects to the run's default chapter. */
export const runHomeRoute = (runId: string): Route => runPath(runId) as Route

export const adminRoute = (runId: string): Route => `${runPath(runId)}/${ADMIN_SECTION}` as Route

/** `characterId` is the registry ID (`Marie`), so the address can be read and shared. */
export const chapterRoute = (
  runId: string,
  chapter: number,
  section: ChapterSection,
  characterId?: string,
): Route => {
  const sectionPath = `${runPath(runId)}/${CHAPTER_SEGMENT}/${chapter}/${section}`

  return (characterId === undefined ? sectionPath : `${sectionPath}/${encodeURIComponent(characterId)}`) as Route
}

export const sectionRoute = (runId: string, section: RunSection, chapter: number): Route =>
  section === ADMIN_SECTION ? adminRoute(runId) : chapterRoute(runId, chapter, section)

/**
 * Výstupy of chapter N are the documents **for chapter N+1**, filled from the
 * state after N (§8.3): chapter 1's documents are fixed text printed before the
 * game, and after the last chapter nothing is printed any more.
 */
export const OUTPUTS_SECTION: ChapterSection = 'vystupy'

export const chapterHasSection = (section: ChapterSection, chapter: number, lastChapter: number): boolean =>
  section !== OUTPUTS_SECTION || chapter < lastChapter

/** The chapter whose documents the Výstupy of `chapter` show. */
export const outputsDocumentChapter = (chapter: number): number => chapter + 1

export const isChapterSection = (value: string | undefined): value is ChapterSection =>
  value !== undefined && (CHAPTER_SECTIONS as readonly string[]).includes(value)
