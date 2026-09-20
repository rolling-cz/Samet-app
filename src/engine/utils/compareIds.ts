/**
 * Plain code-point order, deliberately not locale-aware: a collation that
 * differs between machines would make the same input produce two different
 * outputs, and IDs from the workbook are ASCII anyway.
 */
export const compareIds = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)
