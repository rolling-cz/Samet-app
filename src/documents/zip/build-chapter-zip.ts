/**
 * The chapter zip in the layout of §10.4:
 *
 *   dokumenty/postava_<ID>_<Prijmeni>.md, skupina_<ID>_<Nazev>.md,
 *             postavy.pdf, skupiny.pdf
 *   vysledky.xlsx, beh.json
 *
 * Lives outside the barrel with the renderer it calls: react-pdf is ESM only.
 * The caller decides whether the set may be printed at all (`printBlocker`).
 */
import JSZip from 'jszip'
import { MERGED_PDF_NAME, ZIP_DOCUMENTS_FOLDER } from '../constants/output-names'
import { resultsWorkbook } from '../convert/results-workbook'
import { runArchiveJson, type RunArchiveInput } from '../convert/run-archive'
import { renderDocumentsPdf } from '../pdf/render-pdf'

const RESULTS_FILE = 'vysledky.xlsx'
const ARCHIVE_FILE = 'beh.json'

export const buildChapterZip = async (input: RunArchiveInput): Promise<Buffer> => {
  const zip = new JSZip()
  const folder = zip.folder(ZIP_DOCUMENTS_FOLDER)
  if (!folder) throw new Error(`Složka ${ZIP_DOCUMENTS_FOLDER} v zipu nevznikla.`)

  for (const document of input.documents) folder.file(document.fileName, document.markdown)

  for (const kind of ['character', 'group'] as const) {
    const ofKind = input.documents.filter((document) => document.owner.kind === kind)
    if (ofKind.length > 0) folder.file(MERGED_PDF_NAME[kind], await renderDocumentsPdf(ofKind))
  }

  zip.file(RESULTS_FILE, resultsWorkbook(input.overview))
  zip.file(ARCHIVE_FILE, runArchiveJson(input))

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}
