import {
  generateDocuments,
  loadComputationRecord,
  outputDownloadName,
  resolveOutputFile,
  type DocumentSet,
} from '@/documents'
import { renderDocumentsPdf } from '@/documents/pdf/render-pdf'
import { buildChapterZip } from '@/documents/zip/build-chapter-zip'
import { forRun } from '@/db'
import { chapterHasSection, lastChapterNumber, OUTPUTS_SECTION, outputsDocumentChapter } from '@/core'
import { loadRunShell } from '@/core/services/load-run-shell'
import { parseChapterNumber } from '@/core/utils/parse-chapter-number'
import { vystupy } from '@/locales/cs/vystupy'
import { attachmentDisposition } from '@/utils/content-disposition'
import { errorMessage } from '@/utils/error-message'
import { HTTP_CONFLICT, HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND, OUTPUT_CONTENT_TYPES } from '../constants/output-file'
import { unavailableText } from '../utils/unavailable-text'

const plain = (status: number, text?: string): Response =>
  new Response(text ?? null, { status, headers: text ? { 'Content-Type': 'text/plain; charset=utf-8' } : undefined })

const attachment = (body: BodyInit, contentType: string, filename: string): Response =>
  new Response(body, { headers: { 'Content-Type': contentType, 'Content-Disposition': attachmentDisposition(filename) } })

/** Next hands the segment over decoded on some paths and encoded on others; accept both. */
const decodeSegment = (segment: string): string => {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

/**
 * One file of a chapter's outputs (§10.4), produced on request from the
 * archive and the confirmed computation — nothing is stored, so a download
 * always shows what the screen shows. The run and chapter are part of every
 * downloaded name (§3.3).
 */
export const outputFileResponse = async (runId: string, chapterSegment: string, fileSegment: string): Promise<Response> => {
  const shell = await loadRunShell(runId)
  const sectionChapter = parseChapterNumber(chapterSegment)
  if (!shell || sectionChapter === undefined) return plain(HTTP_NOT_FOUND)

  // The Výstupy of chapter N serve the documents for chapter N+1 (§8.3).
  if (!chapterHasSection(OUTPUTS_SECTION, sectionChapter, lastChapterNumber(shell.chapters))) return plain(HTTP_NOT_FOUND)
  const chapter = outputsDocumentChapter(sectionChapter)

  const set: DocumentSet = await generateDocuments(shell.run.id, chapter)
  if (set._type !== 'ready') return plain(HTTP_CONFLICT, unavailableText(set))

  const fileName = decodeSegment(fileSegment)
  const file = resolveOutputFile(fileName, {
    runId: shell.run.id,
    chapter,
    documents: set.documents,
    missingOwners: set.missingTemplates.map(({ owner }) => owner),
  })
  const downloadName = outputDownloadName(shell.run.id, chapter, fileName)

  switch (file._type) {
    case 'not_found':
      return plain(HTTP_NOT_FOUND)
    case 'not_printable':
      return plain(HTTP_CONFLICT, vystupy.notPrintable[file.reason])
    case 'markdown':
      return attachment(file.document.markdown, OUTPUT_CONTENT_TYPES.markdown, downloadName)
    case 'pdf':
      return rendered(downloadName, async () =>
        attachment(new Uint8Array(await renderDocumentsPdf(file.documents)), OUTPUT_CONTENT_TYPES.pdf, downloadName),
      )
    case 'zip':
      return rendered(downloadName, async () => {
        const computation =
          set.computationId === undefined ? undefined : await loadComputationRecord(forRun(shell.run.id), set.computationId)
        const zip = await buildChapterZip({
          runId: shell.run.id,
          chapter,
          generatedAt: new Date(),
          computation,
          overview: set.overview,
          documents: set.documents,
        })

        return attachment(new Uint8Array(zip), OUTPUT_CONTENT_TYPES.zip, downloadName)
      })
  }
}

/**
 * Rendering is where the deployed function differs from a local run (fonts on
 * disk, the PDF engine), so a failure says why — to the org in the response,
 * and with the stack in the function log — rather than a bare 500.
 */
const rendered = async (fileName: string, render: () => Promise<Response>): Promise<Response> => {
  try {
    return await render()
  } catch (cause) {
    console.error(`Output ${fileName} failed to render`, cause)

    return plain(HTTP_INTERNAL_ERROR, vystupy.renderFailed(fileName, errorMessage(cause)))
  }
}
