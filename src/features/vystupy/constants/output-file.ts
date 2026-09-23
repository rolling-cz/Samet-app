import { chapterRoute } from '@/core'

export const OUTPUT_CONTENT_TYPES = Object.freeze({
  markdown: 'text/markdown; charset=utf-8',
  pdf: 'application/pdf',
  zip: 'application/zip',
} as const)

export const HTTP_NOT_FOUND = 404
/** The file exists in principle but may not be produced yet — a document with a problem (§8.1). */
export const HTTP_CONFLICT = 409

export const HTTP_INTERNAL_ERROR = 500

/** Path segment the download route lives under, inside the chapter's Výstupy. */
const OUTPUT_FILE_SEGMENT = 'soubor'

/** Plain `<a href download>`, so no typed route. */
export const outputFilePath = (runId: string, chapter: number, fileName: string): string =>
  `${chapterRoute(runId, chapter, 'vystupy')}/${OUTPUT_FILE_SEGMENT}/${encodeURIComponent(fileName)}`
