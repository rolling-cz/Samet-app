/**
 * Closes the gap an empty variant leaves behind (§8.2).
 *
 * A "nothing happened" variant has empty text, and its marker usually sits on a
 * line of its own between two blank ones. Removing it therefore leaves three
 * blank lines in a row, which prints as a hole in the middle of the document —
 * §8.2 says the marker vanishes *without a trace*.
 *
 * Collapses runs of blank lines to one, drops trailing spaces, and ends the
 * file with exactly one newline. Never touches anything else: the text outside
 * markers is the author's (§8.4).
 */
export const tidyBlankLines = (markdown: string): string => {
  const tidied = markdown
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '')

  return tidied === '' ? '' : `${tidied}\n`
}
