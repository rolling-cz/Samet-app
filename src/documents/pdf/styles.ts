/** The theme turned into react-pdf styles, once. */
import { StyleSheet } from '@react-pdf/renderer'
import { DOCUMENT_THEME as T } from './document-theme'

export const styles = StyleSheet.create({
  page: {
    backgroundColor: T.color.page,
    color: T.color.body,
    fontFamily: T.font.body,
    fontSize: T.size.body,
    lineHeight: T.size.lineHeight,
    paddingTop: T.space.page,
    paddingBottom: T.space.page,
    paddingHorizontal: T.space.page,
  },
  logo: {
    position: 'absolute',
    top: T.space.page,
    right: T.space.page,
    width: T.logo.size,
    height: T.logo.size,
  },
  title: {
    fontFamily: T.font.display,
    fontSize: T.size.title,
    color: T.color.title,
    letterSpacing: T.space.titleLetterSpacing,
    lineHeight: 1.25,
    textTransform: 'uppercase',
    // Keeps the title line clear of the emblem in the corner.
    marginRight: T.logo.size + T.space.block,
    marginBottom: T.space.block,
  },
  heading2: {
    fontFamily: T.font.display,
    fontSize: T.size.heading + 2,
    color: T.color.title,
    letterSpacing: T.space.titleLetterSpacing / 2,
    textTransform: 'uppercase',
    marginTop: T.space.block + T.space.beforeHeading,
    marginBottom: T.space.block / 2,
  },
  heading3: {
    fontSize: T.size.heading,
    fontWeight: 700,
    color: T.color.heading,
    marginTop: T.space.block + T.space.beforeHeading / 2,
    marginBottom: T.space.block / 3,
  },
  paragraph: { marginBottom: T.space.block },
  listRow: { flexDirection: 'row', marginBottom: T.space.block / 3 },
  listMarker: { width: T.space.listMarker, color: T.color.heading, fontWeight: 700 },
  listItem: { flex: 1 },
  list: { marginLeft: T.space.listIndent, marginBottom: T.space.block },
  rule: { borderBottomWidth: 1, borderBottomColor: T.color.rule, marginVertical: T.space.block },
  bold: { fontWeight: 700 },
  italic: { fontStyle: 'italic' },
  boldItalic: { fontWeight: 700, fontStyle: 'italic' },
})
