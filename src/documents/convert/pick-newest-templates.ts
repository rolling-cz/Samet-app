/**
 * Which uploaded template wins for each owner and chapter.
 *
 * Templates are an optional part of an upload, so "the newest upload" is the
 * wrong unit: later uploading only a corrected `Marie_2.md` must not drop the
 * other 89. The winner is decided **per owner × chapter**, newest first — and a
 * template from Google beats any upload, which is only the fallback (§10.2).
 *
 * Pure, so the rule is testable without a database — the archive shell only
 * reads the rows and unpacks them.
 */
import { templateKey, templateWins } from '@/import/template-upload'
import type { ParsedTemplate } from '@/import/types/parsed-template'

export interface ArchivedTemplate {
  template: ParsedTemplate
  /** The archived file it came out of — a loose `.md` or a zip (§10.2). */
  uploadFilename: string
  uploadedAt: Date
}

export interface PickedTemplates {
  /** `<ownerRef in lower case>#<chapter>`, the key `templateCoverage` uses. */
  byOwner: Map<string, ArchivedTemplate>
  /** Archived files whose name matches no owner and chapter (§10.2). */
  unmatched: string[]
}

export { templateKey }

export const pickNewestTemplates = (archived: readonly ArchivedTemplate[]): PickedTemplates => {
  const byOwner = new Map<string, ArchivedTemplate>()
  const unmatched: string[] = []

  const newestFirst = [...archived].sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())

  for (const entry of newestFirst) {
    const { ownerRef, chapter } = entry.template
    if (ownerRef === undefined || chapter === undefined) {
      unmatched.push(entry.template.filename)
      continue
    }

    const key = templateKey(ownerRef, chapter)
    const current = byOwner.get(key)
    // Newest first, so a current entry is newer — unless it is an upload and this one came from Google.
    if (current && !templateWins(entry.template, current.template)) continue
    byOwner.set(key, entry)
  }

  return { byOwner, unmatched }
}
