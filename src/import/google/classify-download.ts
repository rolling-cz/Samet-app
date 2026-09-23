/**
 * What one export request to Google actually returned (§10.2).
 *
 * The request is made with `redirect: 'manual'` on purpose: a document that is
 * not shared answers with a redirect to the login page, and following it would
 * archive that page as a character's template. The only redirect followed is
 * the export's own hop to `googleusercontent.com` (`exportRedirectTarget`).
 * Anything that looks like HTML is refused, whatever the content type claims.
 */

export interface DownloadResponse {
  status: number
  location?: string | null
  contentType?: string | null
  contentDisposition?: string | null
  body: Uint8Array
}

export type DownloadOutcome =
  | { _type: 'ok'; markdown: string; title?: string }
  /** Not shared with „anyone with the link" — the login page instead of the text. */
  | { _type: 'not_public' }
  | { _type: 'not_found' }
  | { _type: 'forbidden' }
  | { _type: 'not_markdown'; contentType: string }
  | { _type: 'empty' }
  | { _type: 'rate_limited' }
  | { _type: 'failed'; status: number }

const LOGIN_HOSTS = /(^|\.)accounts\.google\.com$/

/**
 * A shared document's export answers 307 to a one-off URL on this host
 * (`doc-0g-60-docstext.googleusercontent.com/export/…`), where the text is.
 * That is the one redirect worth following — https only, one hop.
 */
const CONTENT_HOST = /^[a-z0-9-]+\.googleusercontent\.com$/

/** The content URL to fetch next, when this response is the export's own redirect. */
export const exportRedirectTarget = (response: Pick<DownloadResponse, 'status' | 'location'>): string | undefined => {
  if (!isRedirect(response.status) || !response.location) return undefined

  try {
    const url = new URL(response.location)

    return url.protocol === 'https:' && CONTENT_HOST.test(url.hostname) ? url.toString() : undefined
  } catch {
    return undefined
  }
}

const HTML_START = /^\s*<(?:!doctype\s+html|html[\s>])/i
const BOM = '\uFEFF'

const isRedirect = (status: number): boolean => status >= 300 && status < 400

const decode = (body: Uint8Array): string => {
  const text = new TextDecoder('utf-8').decode(body)

  return text.startsWith(BOM) ? text.slice(BOM.length) : text
}

/** `attachment; filename="x.md"; filename*=UTF-8''Mirek%20Pokorn%C3%BD.md` → `Mirek Pokorný`. */
export const titleFromDisposition = (header: string | null | undefined): string | undefined => {
  if (!header) return undefined

  const extended = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header)?.[1]
  let name: string | undefined
  if (extended !== undefined) {
    try {
      name = decodeURIComponent(extended.trim())
    } catch {
      name = undefined
    }
  }
  name ??= /filename\s*=\s*"([^"]*)"/i.exec(header)?.[1] ?? /filename\s*=\s*([^;]+)/i.exec(header)?.[1]?.trim()

  const title = name?.replace(/\.md$/i, '').trim()

  return title === '' ? undefined : title
}

export const classifyDownload = (response: DownloadResponse): DownloadOutcome => {
  const { status } = response

  if (isRedirect(status)) {
    // Any redirect is refused; a login one is by far the common case and gets its own reason.
    let host = ''
    try {
      host = new URL(response.location ?? '', 'https://docs.google.com').hostname
    } catch {
      host = ''
    }

    return LOGIN_HOSTS.test(host) || host === 'docs.google.com' ? { _type: 'not_public' } : { _type: 'failed', status }
  }
  if (status === 401) return { _type: 'not_public' }
  if (status === 403) return { _type: 'forbidden' }
  if (status === 404) return { _type: 'not_found' }
  if (status === 429) return { _type: 'rate_limited' }
  if (status < 200 || status >= 300) return { _type: 'failed', status }

  const contentType = (response.contentType ?? '').toLowerCase()
  const text = decode(response.body)
  if (HTML_START.test(text) || contentType.startsWith('text/html')) return { _type: 'not_public' }
  if (contentType !== '' && !contentType.startsWith('text/')) return { _type: 'not_markdown', contentType }
  if (text.trim() === '') return { _type: 'empty' }

  return { _type: 'ok', markdown: text, title: titleFromDisposition(response.contentDisposition) }
}
