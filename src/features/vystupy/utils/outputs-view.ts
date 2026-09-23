import { chapterZipName, pdfNameOf, printBlocker, type DocumentSet } from '@/documents'
import { APP_LOCALE, APP_TIME_ZONE } from '@/locales/app-locale'
import type { OutputsView } from '../types/outputs-view'

const UPLOADED_AT = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  day: 'numeric',
  month: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

type ReadySet = Extract<DocumentSet, { _type: 'ready' }>

/** The same `printBlocker` the download route applies, so a button is enabled exactly when its file exists. */
export const outputsView = (runId: string, chapter: number, set: ReadySet): OutputsView => {
  const missing = set.missingTemplates.map(({ owner }) => owner)
  const ofKind = (kind: 'character' | 'group') =>
    printBlocker(
      set.documents.filter((document) => document.owner.kind === kind),
      missing.filter((owner) => owner.kind === kind),
    )

  return {
    runId,
    chapter,
    documentChapter: set.chapter,
    computationVersion: set.computationVersion,
    overview: set.overview,
    documents: set.documents.map((document) => ({
      owner: document.owner,
      ownerLabel: document.ownerLabel,
      fileName: document.fileName,
      pdfName: pdfNameOf(document),
      markdown: document.markdown,
      problems: document.problems,
      template: {
        fromGoogle: document.template.fromGoogle,
        uploadFilename: document.template.uploadFilename,
        uploadedAt: UPLOADED_AT.format(document.template.uploadedAt),
        ...(document.template.googleUrl === undefined ? {} : { googleUrl: document.template.googleUrl }),
      },
    })),
    missingTemplateLabels: set.missingTemplates.map(({ ownerLabel }) => ownerLabel),
    blockers: { zip: printBlocker(set.documents, missing), character: ofKind('character'), group: ofKind('group') },
    zipName: chapterZipName(runId, set.chapter),
    canRefresh: set.documents.some((document) => document.template.googleUrl !== undefined),
  }
}
