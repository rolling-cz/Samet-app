/**
 * One document as one `<Page>` element (§8.6).
 *
 * Giving every document its own `<Page>` is what merges them by type: a
 * `postavy.pdf` is simply one `<Document>` holding them all, and the break
 * between two characters is guaranteed without a page-break rule. A document
 * longer than a sheet flows onto further sheets by itself.
 *
 * The page adds no heading of its own. The template opens with its own `#`
 * line — the character's name, built from `{JMENO} {PRIJMENI}` so a marriage
 * carries through (§8.4) — and inventing a second title here would print it
 * twice.
 */
import { Page, Path, Svg, Text, View } from '@react-pdf/renderer'
import type { ListMarker, MdBlock, MdInline } from '../types/markdown-node'
import { DOCUMENT_THEME } from './document-theme'
import { documentLogo } from './logo'
import { styles } from './styles'

export interface DocumentPageProps {
  blocks: MdBlock[]
}

export const DocumentPage = ({ blocks }: DocumentPageProps) => {
  const logo = documentLogo()

  return (
    <Page size="A4" style={styles.page}>
      {/* Drawn straight into the tree, never behind a `render` callback: that
          content is produced after layout, so the `<Svg>` would have no box and
          react-pdf would skip the viewBox scaling — the paths would be drawn in
          their own 0–488 space and clipped to a corner of the emblem.
          Absolute and not `fixed`, so it appears once, on the first sheet. */}
      <View style={styles.logo}>
        <Svg viewBox={logo.viewBox} width={DOCUMENT_THEME.logo.size} height={DOCUMENT_THEME.logo.size}>
          {logo.paths.map((path, index) => (
            <Path key={index} d={path.d} fill={path.fill} />
          ))}
        </Svg>
      </View>
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </Page>
  )
}

const Block = ({ block }: { block: MdBlock }) => {
  switch (block.kind) {
    case 'rule':
      return <View style={styles.rule} />
    case 'heading':
      // `#` is the document's title line, `##` a section, `###` a label.
      return (
        <Text style={block.level === 1 ? styles.title : block.level === 2 ? styles.heading2 : styles.heading3}>
          <Inlines parts={block.content} />
        </Text>
      )
    case 'paragraph':
      return (
        <Text style={styles.paragraph}>
          <Inlines parts={block.content} />
        </Text>
      )
    case 'list':
      return (
        <View style={styles.list}>
          {block.items.map((item, index) => (
            <View key={index} style={styles.listRow} wrap={false}>
              <Text style={styles.listMarker}>{markerFor(block.marker, index)}</Text>
              <Text style={styles.listItem}>
                <Inlines parts={item} />
              </Text>
            </View>
          ))}
        </View>
      )
  }
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'

/** The marker is drawn, never taken from the text — that is the design's call (§8.1). */
const markerFor = (marker: ListMarker, index: number): string =>
  marker === 'bullet' ? '•' : `${LETTERS[index] ?? String(index + 1)})`

const Inlines = ({ parts }: { parts: MdInline[] }) => (
  <>
    {parts.map((part, index) => (
      <Text
        key={index}
        style={
          part.emphasis === 'bold'
            ? styles.bold
            : part.emphasis === 'italic'
              ? styles.italic
              : part.emphasis === 'boldItalic'
                ? styles.boldItalic
                : undefined
        }
      >
        {part.text}
      </Text>
    ))}
  </>
)
