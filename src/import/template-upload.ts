/**
 * Uploading document templates (§10.2).
 *
 * Templates arrive as Markdown exported from Google Docs, either as several
 * `.md` files at once or as one zip. All three chapters are uploaded once at
 * the start of the run, so the screen has to show which character or group
 * still has none.
 */
import JSZip from 'jszip'
import { personLabel } from '@/utils/person-label'
import { DOWNLOAD_REPORT_FILE } from './constants/google-templates'
import { toParsedTemplate } from './template'
import type { ParsedConfig } from './types/parsed-config'
import type { ParsedTemplate, UploadedTemplate } from './types/parsed-template'

export interface RawFile {
  filename: string
  /** Raw bytes; text files are decoded as UTF-8 to keep diacritics intact. */
  data: ArrayBuffer | Uint8Array
}

/** Reads `.md` files, unpacking any zip among them. */
export const readTemplateFiles = async (files: RawFile[]): Promise<ParsedTemplate[]> => {
  const collected: UploadedTemplate[] = []

  for (const file of files) {
    if (/\.zip$/i.test(file.filename)) {
      collected.push(...(await readZip(file.data)))
      continue
    }
    if (!/\.md$/i.test(file.filename)) continue
    collected.push({ filename: file.filename, markdown: decodeUtf8(file.data) })
  }

  return collected.map(toParsedTemplate)
}

const readZip = async (data: ArrayBuffer | Uint8Array): Promise<UploadedTemplate[]> => {
  const zip = await JSZip.loadAsync(data)
  const fromGoogle = zip.file(DOWNLOAD_REPORT_FILE) !== null
  const out: UploadedTemplate[] = []

  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue
    // Zips from macOS carry a `__MACOSX` shadow tree; it is not content.
    if (entry.name.startsWith('__MACOSX/') || entry.name.includes('/._')) continue
    if (!/\.md$/i.test(entry.name)) continue
    out.push({ filename: entry.name, markdown: await entry.async('string'), ...(fromGoogle ? { fromGoogle } : {}) })
  }

  return out
}

const decodeUtf8 = (data: ArrayBuffer | Uint8Array): string => {
  return new TextDecoder('utf-8').decode(data instanceof Uint8Array ? data : new Uint8Array(data))
}


export interface TemplateAssignment {
  /** Character or group the template belongs to. */
  ownerExternalId: string
  ownerName: string
  ownerKind: 'character' | 'group'
  chapter: number
  /** The uploaded file that matched, if any. */
  filename?: string
  status: 'assigned' | 'missing'
}

export interface TemplateCoverage {
  assignments: TemplateAssignment[]
  /** Uploaded files whose name matches no character, group or chapter. */
  unmatched: ParsedTemplate[]
  missingCount: number
  /** Templates replaced by a later one for the same owner and chapter. */
  duplicates: { overridden: ParsedTemplate; used: ParsedTemplate }[]
}

/**
 * Matches uploaded files to characters and groups by file name (§10.2), so the
 * org can see at a glance who still has no document.
 *
 * All three chapters are uploaded at the start of the run, so a character is
 * expected to have one template per chapter the workbook carries — a missing
 * one is a gap, not a "not yet".
 */
export const templateCoverage = (
  config: ParsedConfig,
  templates: ParsedTemplate[],
): TemplateCoverage => {
  const byKey = new Map<string, ParsedTemplate>()
  const overridden: { key: string; template: ParsedTemplate }[] = []
  for (const template of templates) {
    if (template.ownerRef === undefined || template.chapter === undefined) continue
    const key = templateKey(template.ownerRef, template.chapter)
    const previous = byKey.get(key)
    if (previous && templateWins(previous, template)) {
      overridden.push({ key, template })
      continue
    }
    if (previous) overridden.push({ key, template: previous })
    byKey.set(key, template)
  }

  const usedKeys = new Set<string>()
  const assignments: TemplateAssignment[] = []

  const expect = (
    ownerExternalId: string,
    ownerName: string,
    ownerKind: TemplateAssignment['ownerKind'],
  ) => {
    for (const chapter of config.chapters) {
      const key = templateKey(ownerExternalId, chapter)
      const match = byKey.get(key)
      if (match) usedKeys.add(key)

      assignments.push({
        ownerExternalId,
        ownerName,
        ownerKind,
        chapter,
        filename: match?.filename,
        status: match ? 'assigned' : 'missing',
      })
    }
  }

  for (const character of config.characters) {
    expect(character.externalId, personLabel(character.firstName, character.lastName, character.externalId), 'character')
  }
  for (const group of config.groups) {
    expect(group.externalId, group.name, 'group')
  }

  return {
    assignments,
    unmatched: templates.filter(
      (t) => t.ownerRef === undefined || t.chapter === undefined || !usedKeys.has(templateKey(t.ownerRef, t.chapter)),
    ),
    missingCount: assignments.filter((a) => a.status !== 'assigned').length,
    duplicates: overridden.flatMap(({ key, template }) => {
      const winner = byKey.get(key)

      return usedKeys.has(key) && winner ? [{ overridden: template, used: winner }] : []
    }),
  }
}

/**
 * Which of two templates for one owner and chapter is used (§10.2): one from
 * Google beats an uploaded file — uploads are the fallback for a tab that did
 * not download — and otherwise the later one wins. The archive picks by the
 * same rule (`pickNewestTemplates`), so the check and the print agree.
 */
export const templateWins = (current: Pick<ParsedTemplate, 'fromGoogle'>, challenger: Pick<ParsedTemplate, 'fromGoogle'>): boolean =>
  current.fromGoogle === true && challenger.fromGoogle !== true

/** Owner × chapter, case-insensitive: the author exports from Docs and the case drifts. */
export const templateKey = (ownerRef: string, chapter: number): string => `${ownerRef.toLowerCase()}#${chapter}`
