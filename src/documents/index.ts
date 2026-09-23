/**
 * Documents: the outgoing path (§8.3).
 *
 *   šablona + vybrané varianty + proměnné → naplněný `.md` → `.pdf` a zip
 *
 * The engine already chose every variant, so nothing here evaluates a condition
 * again — this layer substitutes, lays out and packs. The filling half is pure
 * and testable without a database; only `services/` touches one.
 *
 * `pdf/` and `markdown/` are **not re-exported here**: react-pdf and `marked`
 * ship as ESM only, and pulling them into this barrel would make it unusable
 * from the CommonJS scripts. Import the renderer by path — `@/documents/pdf/render-pdf`,
 * and the zip that calls it — `@/documents/zip/build-chapter-zip`.
 */
export { generateDocuments, type DocumentSet } from './services/generate-documents'
export { loadTemplates } from './services/load-templates'
export { loadComputationRecord } from './services/load-computation-record'
export { chapterZipName, outputDownloadName } from './constants/output-names'
export { pdfNameOf, printBlocker, resolveOutputFile, type NotPrintableReason } from './convert/resolve-output-file'
export type { DocumentOwner, FillProblem, GeneratedDocument } from './types/document'
export type { OutputOverview, OverviewEntry } from './types/overview'
