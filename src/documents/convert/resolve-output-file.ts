/**
 * What a download link in Výstupy asks for, decided by its file name (§10.4).
 *
 * The name is the same one the zip uses, so a link reads like the file it
 * fetches. The rule of §8.1 lives here: a `.md` is always available — it is what
 * the org reads and corrects — but a `.pdf` or the zip only once the documents
 * in it filled without a problem. A merged PDF with a character silently
 * missing would be printed and handed out; it is refused instead.
 */
import { MERGED_PDF_NAME, chapterZipName } from '../constants/output-names'
import type { DocumentOwner, GeneratedDocument } from '../types/document'

export interface OutputFileSource {
  runId: string
  chapter: number
  documents: readonly GeneratedDocument[]
  /** Owners the config expects a document from but no template was uploaded for. */
  missingOwners: readonly DocumentOwner[]
}

export type NotPrintableReason = 'fill_problems' | 'missing_templates' | 'no_documents'

export type OutputFile =
  | { _type: 'markdown'; document: GeneratedDocument }
  | { _type: 'pdf'; documents: GeneratedDocument[] }
  | { _type: 'zip' }
  | { _type: 'not_printable'; reason: NotPrintableReason }
  | { _type: 'not_found' }

const PDF_EXTENSION = '.pdf'
const MD_EXTENSION = '.md'

/** Why a set of documents may not become a PDF yet, or nothing when it may. */
export const printBlocker = (
  documents: readonly GeneratedDocument[],
  missingOwners: readonly DocumentOwner[],
): NotPrintableReason | undefined => {
  if (documents.some((document) => document.problems.length > 0)) return 'fill_problems'
  if (missingOwners.length > 0) return 'missing_templates'
  if (documents.length === 0) return 'no_documents'

  return undefined
}

const printable = (
  documents: GeneratedDocument[],
  missingOwners: readonly DocumentOwner[],
  ready: (documents: GeneratedDocument[]) => OutputFile,
): OutputFile => {
  const reason = printBlocker(documents, missingOwners)

  return reason === undefined ? ready(documents) : { _type: 'not_printable', reason }
}

export const pdfNameOf = (document: GeneratedDocument): string =>
  `${document.fileName.slice(0, -MD_EXTENSION.length)}${PDF_EXTENSION}`

export const resolveOutputFile = (fileName: string, source: OutputFileSource): OutputFile => {
  const { documents, missingOwners } = source

  if (fileName === chapterZipName(source.runId, source.chapter)) {
    return printable([...documents], missingOwners, () => ({ _type: 'zip' }))
  }

  for (const kind of ['character', 'group'] as const) {
    if (fileName !== MERGED_PDF_NAME[kind]) continue

    return printable(
      documents.filter((document) => document.owner.kind === kind),
      missingOwners.filter((owner) => owner.kind === kind),
      (ofKind) => ({ _type: 'pdf', documents: ofKind }),
    )
  }

  const markdown = documents.find((document) => document.fileName === fileName)
  if (markdown) return { _type: 'markdown', document: markdown }

  const single = documents.find((document) => pdfNameOf(document) === fileName)
  if (single) return printable([single], [], (one) => ({ _type: 'pdf', documents: one }))

  return { _type: 'not_found' }
}
