/**
 * Filled documents into a PDF (§8.1, §8.6).
 *
 * Documents merge by type simply by being pages of one `<Document>` — that is
 * what makes `postavy.pdf` and `skupiny.pdf` printable in one go, with no PDF
 * merging library in the way.
 *
 * Fonts are registered and loaded before anything is drawn; skipping that wait
 * would fall back to a face with no Czech diacritics.
 */
import { createElement } from 'react'
import { Document, renderToBuffer } from '@react-pdf/renderer'
import type { GeneratedDocument } from '../types/document'
import { parseMarkdown } from '../markdown/parse-markdown'
import { DocumentPage } from './DocumentPage'
import { registerDocumentFonts } from './fonts'

export const renderDocumentsPdf = async (documents: readonly GeneratedDocument[]): Promise<Buffer> => {
  if (documents.length === 0) throw new Error('PDF nejde vyrobit z nuly dokumentů.')

  await registerDocumentFonts()

  const pages = documents.map((document) =>
    createElement(DocumentPage, { key: document.fileName, blocks: parseMarkdown(document.markdown) }),
  )

  return renderToBuffer(createElement(Document, { title: documents[0]?.ownerLabel }, ...pages))
}
