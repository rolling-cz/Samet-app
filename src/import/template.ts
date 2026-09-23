/**
 * Template markers (§8.4).
 *
 * Markers are simple and unpaired: `{BLOK <Block ID>}` is replaced by the text
 * of the variant the engine picked, `{PROMENNA}` by a value from the character
 * state. The text itself lives in the `N_Content` sheet, not in the template
 * (§8.2), so there is nothing for a closing marker to delimit.
 *
 * No marker may survive into the finished document, so a malformed one has to
 * be caught at upload — not when the org is about to print.
 */
import type { ParsedTemplate, UploadedTemplate } from './types/parsed-template'

/**
 * Variables the filler knows (§8.4).
 *
 * Deliberately short. A character's age has no source — the `Characters` sheet
 * carries no birth year and §4.6 keeps it that way, so a year of birth stays
 * fixed template text. Group membership is not state either (§4.6), so there is
 * no `SKUPINA` to fill. `NAZEV` is the group's own name, which §8.4 forbids
 * hardcoding into the text.
 */
export const KNOWN_VARIABLES = Object.freeze(['JMENO', 'PRIJMENI', 'NAZEV'] as const)

export interface TemplateMarker {
  kind: 'block' | 'variable'
  /** Block ID for `blok`, variable name for `promenna`. */
  name: string
  /** 1-based line in the Markdown file, so the org can find it. */
  line: number
  /** The marker exactly as written. */
  raw: string
}

export interface TemplateMarkerProblem {
  line: number
  raw: string
  /** Czech explanation for the import report. */
  detail: string
}

export interface TemplateParse {
  markers: TemplateMarker[]
  problems: TemplateMarkerProblem[]
  /** Block IDs referenced, deduplicated. */
  blockIds: string[]
  /** Variable names referenced, deduplicated. */
  variables: string[]
}

/** Keyword opening a block marker, `{BLOK <ID>}`. */
const BLOCK_KEYWORD = 'BLOK'

/** Any `{…}` group; what is inside decides whether it is valid. */
const BRACE_GROUP = /\{([^{}]*)\}/g
/** An opening brace with no closing one on the same line. */
const UNCLOSED = /\{[^{}]*$/

/**
 * Google Docs' markdown export escapes punctuation — `{BLOK B_Marie_2_X}`
 * arrives as `{BLOK B\_Marie\_2\_X}` (verified 23. 9. 2026). Inside a marker a
 * backslash is never the author's, so a CommonMark escape is undone before the
 * ID is read; the marker's raw text, escapes included, is still what gets replaced.
 */
const MARKDOWN_ESCAPE = /\\([!-/:-@[-`{-~])/g

const unescapeMarkdown = (text: string): string => text.replace(MARKDOWN_ESCAPE, '$1')

export const parseTemplate = (markdown: string): TemplateParse => {
  const markers: TemplateMarker[] = []
  const problems: TemplateMarkerProblem[] = []
  const blockIds = new Set<string>()
  const variables = new Set<string>()

  markdown.split(/\r?\n/).forEach((text, index) => {
    const line = index + 1

    for (const match of text.matchAll(BRACE_GROUP)) {
      const raw = match[0]
      const inner = unescapeMarkdown(match[1] ?? '').trim()

      if (inner === '') {
        problems.push({ line, raw, detail: 'prázdná značka `{}`' })
        continue
      }

      if (/^\/\s*BLOK/i.test(inner)) {
        // The old paired form. Markers are unpaired since §8.2 moved the text
        // into the sheet, so a closing marker would survive into the document.
        problems.push({
          line,
          raw,
          detail:
            'uzavírací značka `{/BLOK}` se nepoužívá — značky jsou nepárové, text nese list `N_Content` (§8.4)',
        })
        continue
      }

      if (/^BLOK\b/i.test(inner)) {
        const id = inner.slice(BLOCK_KEYWORD.length).trim()
        if (id === '') {
          problems.push({ line, raw, detail: 'značka `{BLOK}` bez ID bloku' })
          continue
        }
        if (/\s/.test(id)) {
          problems.push({
            line,
            raw,
            detail: `ID bloku nesmí obsahovat mezeru, je tam „${id}"`,
          })
          continue
        }
        markers.push({ kind: 'block', name: id, line, raw })
        blockIds.add(id)
        continue
      }

      // Anything else in braces is a variable.
      if (/\s/.test(inner)) {
        problems.push({
          line,
          raw,
          detail: `neznámá značka — čeká se \`{BLOK <ID>}\` nebo proměnná bez mezer`,
        })
        continue
      }
      markers.push({ kind: 'variable', name: inner, line, raw })
      variables.add(inner)
    }

    const stripped = text.replace(BRACE_GROUP, '')
    if (UNCLOSED.test(stripped)) {
      problems.push({
        line,
        raw: UNCLOSED.exec(stripped)?.[0] ?? '{',
        detail: 'neuzavřená značka — chybí `}`',
      })
    }
    if (stripped.includes('}')) {
      problems.push({ line, raw: '}', detail: 'zavírací `}` bez odpovídající `{`' })
    }
  })

  return {
    markers,
    problems,
    blockIds: [...blockIds],
    variables: [...variables],
  }
}

/**
 * Replaces every marker in one pass (§8.3, step [2]).
 *
 * `resolve` returning `undefined` leaves the marker where it is, so the filler
 * reports it as surviving instead of silently printing a blank — §8.4 lets no
 * marker reach the finished document.
 *
 * Lives beside `parseTemplate` so both halves read the same braces.
 */
export const replaceMarkers = (
  text: string,
  resolve: (marker: TemplateMarker) => string | undefined,
): string => {
  // Its own instance: the callback re-enters `parseTemplate`, which matches on
  // the shared one.
  const braces = new RegExp(BRACE_GROUP.source, 'g')

  return text
    .split(/\r?\n/)
    .map((line, index) =>
      line.replace(braces, (raw) => {
        const [marker] = parseTemplate(raw).markers
        if (!marker) return raw

        return resolve({ ...marker, line: index + 1, raw }) ?? raw
      }),
    )
    .join('\n')
}

/**
 * Who a template belongs to, read from its file name (§10.2).
 *
 * `<ID postavy>_<kapitola>.md` or `<ID skupiny>_<kapitola>.md` — `Marie_2.md`,
 * `Funkcionari_2.md`. Nothing else assigns a template: the `Characters` sheet
 * no longer carries a template column, so a misnamed file is reported rather
 * than guessed at.
 *
 * The chapter is the trailing number, which is why the owner ID may itself end
 * in digits without becoming ambiguous.
 */
export interface TemplateFilename {
  ownerRef: string
  chapter: number
}

const FILENAME = /^(.+)_(\d+)$/

export const parseTemplateFilename = (filename: string): TemplateFilename | undefined => {
  const base = (filename.replace(/\.md$/i, '').split('/').pop() ?? filename).trim()
  const match = FILENAME.exec(base)
  if (!match) return undefined

  const chapter = Number(match[2])
  if (!Number.isInteger(chapter)) return undefined

  return { ownerRef: (match[1] ?? '').trim(), chapter }
}

/** Block IDs a piece of text refers to; used for nesting inside variant text (§8.4). */
export const blockMarkers = (text: string): string[] => parseTemplate(text).blockIds

/** A template with its markers read, ready for validation. */
export const toParsedTemplate = ({ filename, markdown, fromGoogle }: UploadedTemplate): ParsedTemplate => {
  const parsed = parseTemplate(markdown)
  const name = parseTemplateFilename(filename)

  return {
    ownerRef: name?.ownerRef,
    chapter: name?.chapter,
    filename,
    markdown,
    ...(fromGoogle ? { fromGoogle } : {}),
    blockIds: parsed.blockIds,
    variables: parsed.variables,
    problems: parsed.problems,
  }
}
