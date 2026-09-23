/**
 * Import findings (§11).
 *
 * An error blocks the config from being used; a warning lets it through. Every
 * message must say where the problem is — sheet, row, column, value — because
 * the author fixes it in the spreadsheet and has to find the row.
 */

export type IssueSeverity = 'error' | 'warning'

/** Stable code so the UI can group findings and tests can assert on them. */
export type IssueCode =
  | 'missing_sheet'
  | 'missing_column'
  | 'empty_sheet'
  | 'unknown_character'
  | 'unknown_scale'
  | 'unknown_resource'
  | 'household_order'
  | 'unknown_group'
  | 'unknown_block'
  | 'unknown_answer'
  | 'unknown_poll'
  | 'poll_without_votes'
  | 'answer_without_question'
  | 'question_without_answers'
  | 'duplicate_id'
  | 'invalid_impact'
  | 'invalid_effect'
  | 'invalid_household'
  | 'value_out_of_range'
  | 'invalid_expression'
  | 'question_condition_not_variation'
  | 'unknown_variation'
  | 'foreign_variation'
  | 'invalid_template_marker'
  | 'block_without_marker'
  | 'marker_without_block'
  | 'block_without_default'
  | 'duplicate_priority'
  | 'missing_priority'
  | 'block_cycle'
  | 'owner_without_template'
  | 'missing_value'
  | 'unreachable_variant'
  | 'scale_without_impact'
  | 'invalid_template_filename'
  | 'foreign_template_block'
  | 'invalid_template_url'
  | 'template_url_without_tab'
  | 'duplicate_template_source'
  | 'shared_template_url'
  | 'owner_without_template_url'
  | 'duplicate_template'

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
