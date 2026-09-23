/**
 * Fetching template tabs from Google Docs (§10.2) — the one piece of network
 * I/O behind both „Načíst z Google" in Správa and „Obnovit z Google" in Výstupy.
 *
 * Only `docs.google.com` URLs composed from a validated ID reach `fetch`; the
 * author's cell never does (SSRF).
 */
import {
  classifyDownload,
  exportRedirectTarget,
  type DownloadedFile,
  type DownloadJob,
} from '@/import'
import { errorMessage } from '@/utils/error-message'
import { mapWithConcurrency } from '@/utils/map-with-concurrency'

/** Six at a time: fast enough for ~90 tabs, gentle enough not to be rate-limited. */
const GOOGLE_CONCURRENCY = 6

/** One export; a document that takes longer is reported as timed out, not waited for. */
const GOOGLE_REQUEST_TIMEOUT_MS = 15_000

/**
 * The whole batch stays well under a route's `maxDuration` (60 s): what does
 * not start by then is reported as skipped rather than lost with a killed function.
 */
const GOOGLE_BATCH_BUDGET_MS = 45_000

/** The report never carries the export URL — only the one the org opens. */
const downloadItemOf = (job: DownloadJob) => ({
  ownerKind: job.ownerKind,
  ownerId: job.ownerId,
  ownerLabel: job.ownerLabel,
  chapter: job.chapter,
  fileName: job.fileName,
  editUrl: job.editUrl,
})

const fetchOne = async (job: DownloadJob, deadline: number): Promise<DownloadedFile> => {
  const timeout = Math.max(1, Math.min(GOOGLE_REQUEST_TIMEOUT_MS, deadline - Date.now()))

  try {
    // `manual`: an unshared document redirects to the login page, which must
    // never be followed and archived as a template. The export's own hop to
    // `googleusercontent.com` is followed by hand, once.
    const signal = AbortSignal.timeout(timeout)
    let response = await fetch(job.exportUrl, { redirect: 'manual', cache: 'no-store', signal })
    const next = exportRedirectTarget({ status: response.status, location: response.headers.get('location') })
    if (next !== undefined) {
      await response.body?.cancel()
      response = await fetch(next, { redirect: 'manual', cache: 'no-store', signal })
    }
    const outcome = classifyDownload({
      status: response.status,
      location: response.headers.get('location'),
      contentType: response.headers.get('content-type'),
      contentDisposition: response.headers.get('content-disposition'),
      body: new Uint8Array(await response.arrayBuffer()),
    })

    switch (outcome._type) {
      case 'ok':
        return { item: { ...downloadItemOf(job), status: 'ok', title: outcome.title }, markdown: outcome.markdown }
      case 'failed':
        return { item: { ...downloadItemOf(job), status: 'failed', detail: String(outcome.status) } }
      case 'not_markdown':
        return { item: { ...downloadItemOf(job), status: 'not_markdown', detail: outcome.contentType } }
      default:
        return { item: { ...downloadItemOf(job), status: outcome._type } }
    }
  } catch (cause) {
    const timedOut = cause instanceof DOMException && (cause.name === 'TimeoutError' || cause.name === 'AbortError')

    return { item: { ...downloadItemOf(job), status: timedOut ? 'timed_out' : 'network_error', detail: errorMessage(cause) } }
  }
}

/** Every job, in input order; nothing is dropped — a failure is a status. */
export const downloadGoogleTemplates = async (jobs: readonly DownloadJob[], startedAt: Date): Promise<DownloadedFile[]> => {
  const deadline = startedAt.getTime() + GOOGLE_BATCH_BUDGET_MS

  return mapWithConcurrency<DownloadJob, DownloadedFile>(jobs, (job) => fetchOne(job, deadline), {
    limit: GOOGLE_CONCURRENCY,
    deadline,
    onSkip: (job) => ({ item: { ...downloadItemOf(job), status: 'skipped_deadline' } }),
  })
}
