/** Char code of `A`, the first spreadsheet column letter. */
export const FIRST_COLUMN_CHAR_CODE = 'A'.charCodeAt(0)

/** Letters in the spreadsheet column alphabet (`A`–`Z`). */
export const COLUMN_ALPHABET_SIZE = 26

/**
 * How far down the header may sit.
 *
 * The author's export puts a banner row above the real header on most sheets
 * (`Questions` / `Responses` spanning several columns), so the header is row 1
 * on `N_Content` and row 2 everywhere else. Looking further than this would
 * start matching data rows.
 */
export const MAX_HEADER_ROW_INDEX = 2
