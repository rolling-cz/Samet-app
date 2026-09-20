/**
 * Separator for internal lookup keys. A character that cannot occur in an ID
 * from the workbook, so `Marie` + `Wealth` can never collide with a single ID
 * someone actually wrote.
 */
export const KEY_SEPARATOR = '\u0000'
