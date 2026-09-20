/**
 * Import findings (§11).
 *
 * An error blocks the config from being used; a warning lets it through. Every
 * message must say where the problem is — sheet, row, column, value — because
 * the author fixes it in the spreadsheet and has to find the row.
 */

export type IssueSeverity = 'chyba' | 'varovani'

/** Stable code so the UI can group findings and tests can assert on them. */
export type IssueCode =
  | 'chybejici_list'
  | 'chybejici_sloupec'
  | 'prazdny_list'
  | 'neznama_postava'
  | 'neznama_skala'
  | 'neznamy_zdroj'
  | 'poradi_domacnosti'
  | 'neznama_skupina'
  | 'neznamy_blok'
  | 'neznama_odpoved'
  | 'neznama_anketa'
  | 'odpoved_bez_otazky'
  | 'otazka_bez_odpovedi'
  | 'duplicitni_id'
  | 'vadny_dopad_na_skalu'
  | 'vadny_efekt'
  | 'vadna_domacnost'
  | 'hodnota_mimo_rozsah'
  | 'vadny_vyraz'
  | 'vadna_znacka_sablony'
  | 'blok_bez_znacky'
  | 'znacka_bez_bloku'
  | 'blok_bez_default'
  | 'stejna_priorita'
  | 'chybejici_priorita'
  | 'cyklus_bloku'
  | 'postava_bez_sablony'
  | 'chybejici_hodnota'
  | 'nedosazitelna_varianta'
  | 'skala_bez_dopadu'
  | 'neplatny_nazev_sablony'

/** Where in the uploaded file the problem sits. */
export interface IssueLocation {
  /** Sheet name as it appears in the workbook, e.g. `2_Questions`. */
  sheet: string
  /** 1-based row as the author sees it in the spreadsheet (header is row 1). */
  row?: number
  /** Column header, e.g. `Scale and Resources Impact`. */
  column?: string
  /** Spreadsheet cell, e.g. `I5` — filled in when the column is known. */
  cell?: string
}

export interface Issue {
  severity: IssueSeverity
  code: IssueCode
  location: IssueLocation
  /** Czech, addressed to the game author. */
  message: string
  /** The offending value, quoted back so the author can search for it. */
  value?: string
  /** "Did you mean …?" — only when a near match was found. */
  suggestion?: string
}
