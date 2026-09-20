/** Lowercases and strips diacritics, so `Věra` and `vera` compare equal. */
export const foldText = (value: string): string =>
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
