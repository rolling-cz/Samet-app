import type { GoogleDocRef } from '../google/google-doc-url'
import type { Sourced } from './sourced'

/** One row of the `Templates` sheet: which Google Doc tab is whose template (§10.2). */
export interface ParsedTemplateSource extends Sourced {
  /** The `Character` cell as written. */
  ownerRef: string
  /** Resolved against the registries; absent when the owner is unknown. */
  owner?: { kind: 'character' | 'group'; id: string }
  chapter: number
  /** The cell exactly as written, for the report. */
  url: string
  /** Absent when the URL could not be read — the row is then an error. */
  ref?: GoogleDocRef
}
