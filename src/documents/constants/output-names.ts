/**
 * Names of the files a chapter's outputs are made of (§10.4).
 *
 * Derived mechanically and identical across chapters and runs, so a folder of
 * exports sorts and reads the same every time.
 *
 * Diacritics stay: exports must carry them undamaged (§13), and zip entries are
 * written as UTF-8. Only characters a file system genuinely refuses are
 * replaced — a surname is never rewritten to `Balazova`.
 */
import type { DocumentOwner } from '../types/document'

/** `postava_…` / `skupina_…`; the prefix says what kind of document it is (§8.6). */
export const OWNER_FILE_PREFIX = Object.freeze({ character: 'postava', group: 'skupina' } as const)

/** Merged per type so they can be printed in one go (§8.6). */
export const MERGED_PDF_NAME = Object.freeze({ character: 'postavy.pdf', group: 'skupiny.pdf' } as const)

/** Folder the documents sit in inside the zip (§10.4). */
export const ZIP_DOCUMENTS_FOLDER = 'dokumenty'

/** Reserved on Windows, awkward everywhere; whitespace collapses into `_`. */
const UNSAFE_IN_FILENAME = /[\\/:*?"<>|\u0000-\u001f]/g

const safePart = (value: string): string =>
  value.replace(UNSAFE_IN_FILENAME, '').replace(/\s+/g, '_').replace(/^_+|_+$/g, '')

/**
 * `postava_Marie_Balážová.md`, `skupina_Funkcionari_Funkcionáři.md` (§10.4).
 *
 * `namePart` is the surname for a character and the name for a group — the ID
 * alone reads badly on a printed pile, the name alone is not unique.
 */
export const documentFileName = (owner: DocumentOwner, namePart: string, extension: 'md' | 'pdf'): string => {
  const name = safePart(namePart)
  const suffix = name === '' ? '' : `_${name}`

  return `${OWNER_FILE_PREFIX[owner.kind]}_${safePart(owner.id)}${suffix}.${extension}`
}

/** `beh-2026-09-12_A_kapitola-2.zip` — the run is part of every export's name (§3.3). */
export const chapterZipName = (runId: string, chapter: number): string =>
  `beh-${safePart(runId)}_kapitola-${chapter}.zip`

/**
 * A single file downloaded outside the zip carries the run and chapter in its
 * own name — `postavy.pdf` of two runs must not sit side by side unlabelled
 * (§3.3). The zip already names both, so it is left as is.
 */
export const outputDownloadName = (runId: string, chapter: number, fileName: string): string =>
  fileName === chapterZipName(runId, chapter) ? fileName : `beh-${safePart(runId)}_kapitola-${chapter}_${fileName}`
