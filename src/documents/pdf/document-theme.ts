/**
 * The printed document's look (§8.1).
 *
 * Deliberately not the app's MUI theme. The screen is a dense tool the org
 * works in under time pressure (§6.4); this is a sheet of paper a player reads
 * once. Every colour and measure the renderer uses is here, so retuning the
 * design never means hunting through components.
 *
 * Taken from the game's own material: warm cream paper, rust display capitals,
 * dark brown subheadings and a softer brown for the body.
 */
export const DOCUMENT_THEME = Object.freeze({
  color: {
    /** Warm cream; the whole page is tinted, not just a band. */
    page: '#f6e7d8',
    /** Rust red of the display capitals. */
    title: '#a4432f',
    /** Dark brown of the subheadings and inline labels. */
    heading: '#5c3a2b',
    /** Body text: brown-grey, softer than the headings. */
    body: '#6f6259',
    rule: '#d3bda6',
    /** Gold of the emblem, reused for the list markers. */
    accent: '#dfa13e',
  },
  font: {
    /** Rubik Mono One — one weight, used only for the title. */
    display: 'RubikMonoOne',
    /** Urbanist — regular, medium, bold and italic. */
    body: 'Urbanist',
  },
  size: {
    title: 21,
    heading: 12,
    body: 10.5,
    /** Multiplier, not points; react-pdf takes `lineHeight` as a ratio. */
    lineHeight: 1.45,
  },
  space: {
    /** Page margin in points; A4 is 595 × 842. */
    page: 46,
    /** Between two blocks of text. */
    block: 9,
    /** Above a heading, on top of `block`. */
    beforeHeading: 8,
    /** Indent of a list item and the width reserved for its marker. */
    listIndent: 22,
    listMarker: 20,
    /** Tracking of the display capitals; they are set wide in the original. */
    titleLetterSpacing: 1.6,
  },
  logo: {
    /** Points; sits in the top right corner of a document's first page. */
    size: 58,
  },
} as const)
