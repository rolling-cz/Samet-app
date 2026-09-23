/**
 * Markdown into the blocks the PDF renderer draws.
 *
 * `marked` does the lexing — the templates come out of Google Docs and carry
 * whatever it felt like exporting (escapes, links, nested lists), which a
 * hand-written line parser would misread silently. Its tokens are then reduced
 * to the narrow shape in `types/markdown-node.ts`.
 *
 * Nothing throws: an unknown token becomes a paragraph of its own text. A
 * document that prints one construction plainly is recoverable; one that fails
 * to render at all, minutes before it has to be handed out, is not.
 */
import { Lexer, type Token, type Tokens } from 'marked'
import type { Emphasis, ListMarker, MdBlock, MdInline } from '../types/markdown-node'

/** `#`, `##`, `###`; anything deeper prints as the smallest heading. */
const DEEPEST_HEADING = 3

export const parseMarkdown = (markdown: string): MdBlock[] => {
  const blocks: MdBlock[] = []
  for (const token of Lexer.lex(markdown)) collect(token, blocks)

  return blocks
}

const collect = (token: Token, blocks: MdBlock[]): void => {
  switch (token.type) {
    case 'space':
      return
    case 'hr':
      blocks.push({ kind: 'rule' })

      return
    case 'heading': {
      const heading = token as Tokens.Heading
      const level = Math.min(heading.depth, DEEPEST_HEADING) as 1 | 2 | 3
      blocks.push({ kind: 'heading', level, content: inlines(heading.tokens) })

      return
    }
    case 'paragraph':
    case 'text': {
      const paragraph = token as Tokens.Paragraph
      blocks.push({ kind: 'paragraph', content: inlines(paragraph.tokens ?? []) })

      return
    }
    case 'blockquote': {
      // No design for a quote; its contents still belong on the page.
      for (const inner of (token as Tokens.Blockquote).tokens) collect(inner, blocks)

      return
    }
    case 'list': {
      const list = token as Tokens.List
      blocks.push({
        kind: 'list',
        marker: markerOf(list),
        items: list.items.map((item) => inlines(item.tokens ?? [])),
      })

      return
    }
    case 'html':
      // Docs exports a comment as an HTML token; comments never print (§8.4).
      if (/^\s*<!--/.test(token.raw)) return
      blocks.push({ kind: 'paragraph', content: [{ emphasis: 'none', text: token.raw.trim() }] })

      return
    default: {
      const text = ('text' in token ? String(token.text) : token.raw).trim()
      if (text !== '') blocks.push({ kind: 'paragraph', content: [{ emphasis: 'none', text }] })
    }
  }
}

/**
 * Docs writes a lettered list as an ordinary numbered one — the `a) b) c)` of
 * the original is a list style, not text. A literal `a)` typed into the template
 * is honoured too, so either way round it renders the same.
 */
const LETTERED_ITEM = /^[a-z][).]\s+/i

const markerOf = (list: Tokens.List): ListMarker => {
  if (!list.ordered) {
    const looksLettered = list.items.every((item) => LETTERED_ITEM.test(item.text ?? ''))

    return looksLettered ? 'letter' : 'bullet'
  }

  return 'letter'
}

/** Flattens inline tokens, carrying emphasis down through nesting. */
const inlines = (tokens: Token[], carried: Emphasis = 'none'): MdInline[] => {
  const out: MdInline[] = []

  for (const token of tokens) {
    switch (token.type) {
      case 'strong':
        out.push(...inlines((token as Tokens.Strong).tokens, combine(carried, 'bold')))
        break
      case 'em':
        out.push(...inlines((token as Tokens.Em).tokens, combine(carried, 'italic')))
        break
      case 'link':
        // The URL is dropped: paper cannot be clicked, the words still read.
        out.push(...inlines((token as Tokens.Link).tokens, carried))
        break
      case 'br':
        out.push({ emphasis: carried, text: '\n' })
        break
      case 'escape':
      case 'codespan':
      case 'text': {
        const text = 'tokens' in token && token.tokens ? undefined : String((token as Tokens.Text).text)
        if (text === undefined) {
          out.push(...inlines((token as Tokens.Text).tokens ?? [], carried))
          break
        }
        out.push({ emphasis: carried, text: decodeEntities(text) })
        break
      }
      default: {
        const text = 'text' in token ? String(token.text) : token.raw
        if (text !== '') out.push({ emphasis: carried, text: decodeEntities(text) })
      }
    }
  }

  return merge(out)
}

const combine = (carried: Emphasis, added: 'bold' | 'italic'): Emphasis => {
  if (carried === 'none') return added
  if (carried === added) return carried

  return 'boldItalic'
}

/** `marked` escapes these while lexing; the PDF wants the characters back. */
const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
}

const decodeEntities = (text: string): string =>
  text.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity] ?? entity)

/** Adjacent runs of the same emphasis become one, so the renderer emits fewer spans. */
const merge = (parts: MdInline[]): MdInline[] => {
  const out: MdInline[] = []

  for (const part of parts) {
    if (part.text === '') continue
    const last = out.at(-1)
    if (last && last.emphasis === part.emphasis) {
      out[out.length - 1] = { emphasis: last.emphasis, text: last.text + part.text }
      continue
    }
    out.push(part)
  }

  return out
}
