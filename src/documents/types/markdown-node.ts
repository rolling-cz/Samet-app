/**
 * The narrow shape the renderer draws (§8.1).
 *
 * Markdown is lexed by `marked`, then reduced to this. Keeping a shape of our
 * own means the react-pdf mapping stays small and a construction we have no
 * design for degrades into an ordinary paragraph instead of reaching the page
 * as raw syntax.
 */
export type Emphasis = 'none' | 'bold' | 'italic' | 'boldItalic'

export interface MdInline {
  emphasis: Emphasis
  text: string
}

/**
 * How a list marks its items. The marker is the theme's to draw, not the
 * text's: the original sets answer options as `a) b) c)`, so an ordered list
 * prints as letters.
 */
export type ListMarker = 'bullet' | 'letter'

export type MdBlock =
  | { kind: 'heading'; level: 1 | 2 | 3; content: MdInline[] }
  | { kind: 'paragraph'; content: MdInline[] }
  | { kind: 'list'; marker: ListMarker; items: MdInline[][] }
  | { kind: 'rule' }
