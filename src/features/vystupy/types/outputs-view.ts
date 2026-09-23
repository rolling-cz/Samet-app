import type { DocumentOwner, FillProblem, NotPrintableReason, OutputOverview } from '@/documents'

export interface DocumentItemView {
  owner: DocumentOwner
  ownerLabel: string
  fileName: string
  pdfName: string
  markdown: string
  problems: FillProblem[]
  /** Where the template came from, already formatted on the server (one time zone for SSR and the browser). */
  template: { fromGoogle: boolean; uploadFilename: string; uploadedAt: string; googleUrl?: string }
}

/** Why each printable bundle may not be produced yet; absent = it may. */
export interface PrintBlockers {
  zip?: NotPrintableReason
  character?: NotPrintableReason
  group?: NotPrintableReason
}

/** Everything the Výstupy screen shows, decided on the server — the client never sees the rules. */
export interface OutputsView {
  runId: string
  /** The section's chapter, N. */
  chapter: number
  /** The chapter the documents are for, N+1 (§8.3). */
  documentChapter: number
  /** Version of the confirmed computation of chapter N it all comes from. */
  computationVersion?: number
  overview: OutputOverview
  documents: DocumentItemView[]
  missingTemplateLabels: string[]
  blockers: PrintBlockers
  zipName: string
  /** Some owner of the chapter has a tab in the `Templates` sheet. */
  canRefresh: boolean
}
