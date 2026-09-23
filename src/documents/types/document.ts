/** Who a document is for and what came out of filling its template (§8.6). */
import type { ChapterNumber } from '@/engine'

export interface DocumentOwner {
  kind: 'character' | 'group'
  /** The workbook ID — `Marie`, `Funkcionari`. */
  id: string
}

export type FillProblemCode =
  /** `{/BLOK}`, an empty `{}`, an unclosed brace — straight from `parseTemplate`. */
  | 'marker_syntax'
  /** A marker whose block has no variant chosen; a missing roll leaves one (§7.4). */
  | 'unknown_block'
  | 'unknown_variable'
  | 'too_many_passes'
  /** The last guard before the document is stored (§8.4). */
  | 'marker_survived'

export interface FillProblem {
  code: FillProblemCode
  /**
   * Line the marker sat on, so the org can find it. Counted in the text as it
   * stood when the problem surfaced, so a marker that arrived from a variant's
   * own text points into the filled document rather than the template.
   */
  line?: number
  /** The marker exactly as written. */
  raw: string
  /** Czech, for the screen — the same register as the import report. */
  detail: string
}

export interface FilledDocument {
  markdown: string
  problems: FillProblem[]
  passes: number
}

/** Which archived template a document was filled from (§10.2). */
export interface TemplateOrigin {
  /** The archived file — a loose `.md` or a zip. */
  uploadFilename: string
  uploadedAt: Date
  fromGoogle: boolean
  /** The tab the `Templates` sheet names for this owner and chapter, if any. */
  googleUrl?: string
}

export interface GeneratedDocument {
  owner: DocumentOwner
  /** `Marie Balážová`, `Funkcionáři` — what the org reads in the list. */
  ownerLabel: string
  chapter: ChapterNumber
  /** `postava_Marie_Balazova.md` (§10.4). */
  fileName: string
  markdown: string
  problems: FillProblem[]
  template: TemplateOrigin
}
