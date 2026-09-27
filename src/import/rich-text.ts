/**
 * Bold and italic written inside a cell, turned into Markdown (§8.2).
 *
 * Google Sheets exports a partly formatted cell as rich-text runs, which SheetJS
 * hands over untouched as the `<r>…</r>` XML of the shared string. Only bold and
 * italic survive: they have a Markdown form the PDF renderer and the
 * questionnaire both draw. Colour, font and size are on every run Google writes,
 * so they carry no intent; underline and strikethrough do, and are reported as
 * dropped.
 *
 * The XML is the narrow, generated `<r><rPr/><t/></r>` shape, so a few regular
 * expressions read it; anything unexpected falls back to the plain text.
 */

export interface FormattedCell {
  /** The cell text with `**bold**` and `*italic*`. */
  markdown: string
  /**
   * Markers (`{BLOK …}`, `{JMENO}`) the formatting started or ended inside.
   * Each was given the formatting of its opening brace, so it still reads as a
   * marker; the import reports it all the same.
   */
  splitMarkers: string[]
  /** Underline or strikethrough was present and has no Markdown form here. */
  droppedFormatting: boolean
}

interface Flags {
  bold: boolean
  italic: boolean
}

const RUN = /<r>([\s\S]*?)<\/r>/g
const RUN_PROPERTIES = /<rPr>([\s\S]*?)<\/rPr>/
const RUN_TEXT = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g
/** `<b/>`, `<b val="1"/>`, `<b val="true"/>` — but `<b val="0"/>` switches it off. */
const toggle = (properties: string, tag: string): boolean => {
  const match = new RegExp(`<${tag}(\\s[^>]*)?/>`).exec(properties)
  if (!match) return false

  return !/val="(?:0|false)"/.test(match[1] ?? '')
}
const DROPPED_TAGS = /<(?:u|strike)(?:\s[^>]*)?\/>/

/** `{…}` without nested braces — what `parseTemplate` recognises as a marker. */
const MARKER = /\{[^{}]*\}/g

const XML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
}

const decodeXml = (text: string): string =>
  text.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (entity) => {
    if (entity.startsWith('&#x') || entity.startsWith('&#X')) return String.fromCodePoint(parseInt(entity.slice(3, -1), 16))
    if (entity.startsWith('&#')) return String.fromCodePoint(Number(entity.slice(2, -1)))

    return XML_ENTITIES[entity] ?? entity
  })

/**
 * Markdown for a cell whose runs carry formatting; `undefined` when none do,
 * or when the runs do not add up to the cell's own text — a shape we do not
 * understand is better read plainly than guessed at.
 */
export const richTextToMarkdown = (richText: string, plain: string): FormattedCell | undefined => {
  const chars: string[] = []
  const flags: Flags[] = []
  let droppedFormatting = false

  for (const [, run = ''] of richText.matchAll(RUN)) {
    const properties = RUN_PROPERTIES.exec(run)?.[1] ?? ''
    const runFlags = { bold: toggle(properties, 'b'), italic: toggle(properties, 'i') }
    if (DROPPED_TAGS.test(properties)) droppedFormatting = true

    for (const [, text = ''] of run.matchAll(RUN_TEXT)) {
      // UTF-16 units, so indices match the string methods below; a surrogate
      // pair always sits inside one run and is never split.
      for (const char of decodeXml(text).split('')) {
        chars.push(char)
        flags.push(runFlags)
      }
    }
  }

  if (chars.join('') !== plain) return undefined

  const splitMarkers = evenOutMarkers(chars, flags)
  quietWhitespace(chars, flags)
  // A cell that is only underlined still has to be counted as dropped formatting.
  if (!droppedFormatting && !flags.some((flag) => flag.bold || flag.italic)) return undefined

  return { markdown: emit(chars, flags), splitMarkers, droppedFormatting }
}

/** A marker must stay one piece of text, so it takes the formatting of its `{`. */
const evenOutMarkers = (chars: string[], flags: Flags[]): string[] => {
  const split: string[] = []

  for (const match of chars.join('').matchAll(MARKER)) {
    const start = match.index
    const length = match[0].length
    const first = flags[start]
    if (!first) continue

    let differs = false
    for (let index = start; index < start + length; index++) {
      const flag = flags[index]
      if (flag && (flag.bold !== first.bold || flag.italic !== first.italic)) differs = true
      flags[index] = first
    }
    if (differs) split.push(match[0])
  }

  return split
}

/**
 * Whitespace keeps only the formatting both its neighbours share. Markdown
 * does not read `**Věra **` as bold, so the space moves outside the delimiter.
 */
const quietWhitespace = (chars: string[], flags: Flags[]): void => {
  const none: Flags = { bold: false, italic: false }

  for (let index = 0; index < chars.length; index++) {
    if (!/\s/.test(chars[index] ?? '')) continue

    let before = index - 1
    while (before >= 0 && /\s/.test(chars[before] ?? '')) before--
    let after = index + 1
    while (after < chars.length && /\s/.test(chars[after] ?? '')) after++

    const left = flags[before] ?? none
    const right = flags[after] ?? none
    flags[index] = { bold: left.bold && right.bold, italic: left.italic && right.italic }
  }
}

type Style = 'bold' | 'italic'

const DELIMITERS: Record<Style, string> = { bold: '**', italic: '*' }

/** Opens and closes delimiters as a stack, so bold inside italic nests properly. */
const emit = (chars: string[], flags: Flags[]): string => {
  const open: Style[] = []
  let out = ''

  const apply = (wanted: Flags): void => {
    const keep = open.findIndex((style) => !wanted[style])
    if (keep !== -1) {
      for (const style of open.splice(keep).reverse()) out += DELIMITERS[style]
    }
    for (const style of ['bold', 'italic'] as const) {
      if (wanted[style] && !open.includes(style)) {
        open.push(style)
        out += DELIMITERS[style]
      }
    }
  }

  chars.forEach((char, index) => {
    apply(flags[index] ?? { bold: false, italic: false })
    out += char
  })
  apply({ bold: false, italic: false })

  return out
}
