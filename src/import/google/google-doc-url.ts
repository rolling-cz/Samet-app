/**
 * A Google Docs link as the author copies it from the address bar, reduced to
 * the two IDs that matter (§10.2).
 *
 * The download never fetches the author's string: the export URL is rebuilt
 * from a validated ID, so a cell cannot point the server anywhere but
 * `docs.google.com` (SSRF).
 *
 * The tab is `?tab=t.xxx` in the address while that tab is open. The export
 * endpoint honours it for `format=md`, but that is undocumented — hence the
 * import check that a template's markers belong to its own owner and chapter,
 * which catches a whole document silently coming back instead of one tab.
 */

export interface GoogleDocRef {
  documentId: string
  /** `t.0`, `t.abc123`; absent when the link was copied without a tab open. */
  tabId?: string
}

export type GoogleDocUrlError =
  /** `/document/d/e/…/pub` — a published page is HTML, never markdown. */
  | 'published'
  /** A Sheets, Slides, Drive or Forms link. */
  | 'not_a_document'
  | 'invalid'

export type ParsedGoogleDocUrl = { _type: 'ok'; ref: GoogleDocRef } | { _type: 'error'; reason: GoogleDocUrlError }

/** Document IDs are long URL-safe base64; a shorter token is a typo, not an ID. */
const DOCUMENT_ID = /^[A-Za-z0-9_-]{25,}$/
const TAB_ID = /^t\.[A-Za-z0-9_-]+$/

const DOCS_HOST = 'docs.google.com'
const OTHER_GOOGLE_EDITORS = /^\/(?:spreadsheets|presentation|forms|drawings)\//
const PUBLISHED_PATH = /^\/document\/(?:u\/\d+\/)?d\/e\//
const DOCUMENT_PATH = /^\/document\/(?:u\/\d+\/)?d\/([^/]+)/

const ok = (documentId: string, tabId: string | null | undefined): ParsedGoogleDocUrl => {
  if (!DOCUMENT_ID.test(documentId)) return { _type: 'error', reason: 'invalid' }
  if (tabId === null || tabId === undefined || tabId === '') return { _type: 'ok', ref: { documentId } }
  if (!TAB_ID.test(tabId)) return { _type: 'error', reason: 'invalid' }

  return { _type: 'ok', ref: { documentId, tabId } }
}

export const parseGoogleDocUrl = (raw: string): ParsedGoogleDocUrl => {
  // Docs and Sheets paste links wrapped in <…> now and then.
  const text = raw.trim().replace(/^<(.*)>$/, '$1').trim()
  if (text === '') return { _type: 'error', reason: 'invalid' }

  // A bare ID — what is left after copying only the middle of the address.
  if (DOCUMENT_ID.test(text)) return ok(text, undefined)

  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`)
  } catch {
    return { _type: 'error', reason: 'invalid' }
  }

  if (url.hostname === 'drive.google.com') return { _type: 'error', reason: 'not_a_document' }
  if (url.hostname !== DOCS_HOST) return { _type: 'error', reason: 'invalid' }
  if (OTHER_GOOGLE_EDITORS.test(url.pathname)) return { _type: 'error', reason: 'not_a_document' }
  if (PUBLISHED_PATH.test(url.pathname)) return { _type: 'error', reason: 'published' }

  const match = DOCUMENT_PATH.exec(url.pathname)
  if (!match?.[1]) return { _type: 'error', reason: 'invalid' }

  return ok(match[1], url.searchParams.get('tab'))
}

/** Composed from the IDs only — never from the author's string. */
export const googleDocExportUrl = (ref: GoogleDocRef): string => {
  const url = new URL(`https://${DOCS_HOST}/document/d/${ref.documentId}/export`)
  url.searchParams.set('format', 'md')
  if (ref.tabId !== undefined) url.searchParams.set('tab', ref.tabId)

  return url.toString()
}

/** Where the org opens the document to check it — the tab included. */
export const googleDocEditUrl = (ref: GoogleDocRef): string =>
  `https://${DOCS_HOST}/document/d/${ref.documentId}/edit${ref.tabId === undefined ? '' : `?tab=${ref.tabId}`}`
