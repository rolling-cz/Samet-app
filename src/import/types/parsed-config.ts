/**
 * The shape the workbook is parsed into, before anything touches the database.
 *
 * Deliberately a plain data structure: parsing, validating and reporting all
 * work on it without a connection, so the whole import can be tested on
 * fixtures.
 */
import type { Grid } from '../sheet'
import type { ParsedBlock } from './parsed-block'
import type { ParsedCharacter } from './parsed-character'
import type { ParsedGroup } from './parsed-group'
import type { ParsedQuestion } from './parsed-question'
import type { ParsedResourceRow } from './parsed-resource'
import type { ParsedScaleRow } from './parsed-scale'

/** Sheets as the workbook presents them: name to grid. */
export type Workbook = Map<string, Grid>

/** What was quietly cleaned up, reported in the import summary. */
export interface ImportRepairs {
  trimmedCells: number
  filledDownCells: number
  skippedEmptyRows: number
  /** `Character` cells resolved from a name rather than a registry ID. */
  resolvedCharacterNames: number
  /** Question IDs the import derived because the cell was empty (§4.2). */
  derivedQuestionIds: number
  /** `bool` answer IDs derived from the `Ano` / `Ne` text (§6.1). */
  derivedAnswerIds: number
  /** `Ano` / `Ne` rows added to a `bool` question that had none (§6.1). */
  addedBoolAnswers: number
  /** Impact cells separated by `;` rather than `,` — both are accepted. */
  semicolonSeparators: number
}

export interface ParsedConfig {
  /** Chapter numbers the workbook actually carries. */
  chapters: number[]
  characters: ParsedCharacter[]
  groups: ParsedGroup[]
  /** One row per pair character × scale; `Min` / `Max` belong to the pair (§4.2). */
  scales: ParsedScaleRow[]
  /** One row per pair character × resource; resources are unbounded (§4.1). */
  resources: ParsedResourceRow[]
  questions: Map<number, ParsedQuestion[]>
  blocks: Map<number, ParsedBlock[]>
  sheetNames: string[]
  repairs: ImportRepairs
}
