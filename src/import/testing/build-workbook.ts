/**
 * Hand-built workbooks for the import tests.
 *
 * Rows are written as objects keyed by column name, so a test shows only the
 * cells it is actually about and stays readable when a column moves. Every
 * sheet has a default the test can replace.
 */
import {
  ANSWER_BLOCKS_COLUMN,
  ANSWER_ID_COLUMN,
  ANSWER_LABEL_COLUMN,
  EFFECTS_COLUMN,
  IMPACT_COLUMN,
  QUESTION_CONDITION_COLUMN,
  QUESTION_PRIVATE_COLUMN,
  QUESTION_SOURCE_COLUMN,
} from '../constants/sheets'
import type { Workbook } from '../types/parsed-config'

export type Row = Record<string, string>

export interface WorkbookParts {
  characters?: Row[]
  groups?: Row[]
  scales?: Row[]
  resources?: Row[]
  questions?: Row[]
  content?: Row[]
  /** Adds an empty `1_Questions`, so the workbook carries chapter 1 too. */
  chapterOne?: boolean
  /** Sheets to add or replace outright, as raw grids. */
  extra?: Record<string, string[][]>
  /** Sheets to leave out entirely. */
  omit?: string[]
}

const CHARACTER_COLUMNS = ['ID', 'Name', 'Surname', 'Household']
const GROUP_COLUMNS = ['ID', 'Name']
const SCALE_COLUMNS = ['Character', 'ID', 'Min', 'Max', 'Default']
const RESOURCE_COLUMNS = ['Character', 'ID', 'Scope', 'Default']
const QUESTION_COLUMNS = [
  'Character',
  QUESTION_CONDITION_COLUMN,
  'ID',
  'Type',
  'Text',
  ANSWER_ID_COLUMN,
  ANSWER_LABEL_COLUMN,
  IMPACT_COLUMN,
  ANSWER_BLOCKS_COLUMN,
  EFFECTS_COLUMN,
  QUESTION_SOURCE_COLUMN,
  QUESTION_PRIVATE_COLUMN,
]
const CONTENT_COLUMNS = [
  'Character',
  'Block ID',
  'Variation ID',
  'Variation Description',
  'Variation Text',
  'Priority',
  'Conditions',
]

const DEFAULT_CHARACTERS: Row[] = [
  { ID: 'Marie', Name: 'Marie', Surname: 'Balážová' },
  { ID: 'Mirek', Name: 'Mirek', Surname: 'Pokorný' },
]

const DEFAULT_GROUPS: Row[] = [{ ID: 'SrdceParty', Name: 'Srdce party' }]

const DEFAULT_SCALES: Row[] = [
  { Character: 'Marie', ID: 'S_Marie_Regime', Min: '1', Max: '10', Default: '6' },
  { Character: 'Mirek', ID: 'S_Mirek_Regime', Min: '1', Max: '10', Default: '3' },
]

const DEFAULT_RESOURCES: Row[] = [
  { Character: 'Marie', ID: 'R_Marie_Wealth', Scope: 'household', Default: '4' },
  { Character: 'Mirek', ID: 'R_Mirek_Wealth', Scope: 'household', Default: '6' },
]

const DEFAULT_QUESTIONS: Row[] = [
  {
    Character: 'Marie',
    ID: 'Q_Marie_2_1',
    Type: 'bool',
    Text: 'Otázka?',
    [ANSWER_ID_COLUMN]: 'A_Marie_2_1_Ano',
    [ANSWER_LABEL_COLUMN]: 'Ano',
    [IMPACT_COLUMN]: 'S_Marie_Regime+1',
    [ANSWER_BLOCKS_COLUMN]: 'B_Marie_2_X',
  },
  {
    [ANSWER_ID_COLUMN]: 'A_Marie_2_1_Ne',
    [ANSWER_LABEL_COLUMN]: 'Ne',
    [ANSWER_BLOCKS_COLUMN]: 'B_Marie_2_X',
  },
]

const DEFAULT_CONTENT: Row[] = [
  {
    Character: 'Marie',
    'Block ID': 'B_Marie_2_X',
    'Variation ID': 'V_A',
    'Variation Text': 'Text A',
    Priority: '1',
    Conditions: 'A_Marie_2_1_Ano',
  },
  { 'Variation ID': 'V_B', 'Variation Text': 'Text B', Priority: '2', Conditions: 'DEFAULT' },
]

const grid = (columns: string[], rows: Row[]): string[][] => [
  columns,
  ...rows.map((row) => columns.map((column) => row[column] ?? '')),
]

export const buildWorkbook = (parts: WorkbookParts = {}): Workbook => {
  const workbook: Workbook = new Map<string, string[][]>([
    ['Characters', grid(CHARACTER_COLUMNS, parts.characters ?? DEFAULT_CHARACTERS)],
    ['Groups', grid(GROUP_COLUMNS, parts.groups ?? DEFAULT_GROUPS)],
    ['Scales', grid(SCALE_COLUMNS, parts.scales ?? DEFAULT_SCALES)],
    ['Resources', grid(RESOURCE_COLUMNS, parts.resources ?? DEFAULT_RESOURCES)],
    ['2_Questions', grid(QUESTION_COLUMNS, parts.questions ?? DEFAULT_QUESTIONS)],
    ['2_Content', grid(CONTENT_COLUMNS, parts.content ?? DEFAULT_CONTENT)],
  ])

  if (parts.chapterOne) workbook.set('1_Questions', grid(QUESTION_COLUMNS, []))
  for (const [name, cells] of Object.entries(parts.extra ?? {})) workbook.set(name, cells)
  for (const name of parts.omit ?? []) workbook.delete(name)

  return workbook
}

/** The `.md` files a default workbook expects, so coverage checks can match them. */
export const defaultTemplates = (): { filename: string; markdown: string }[] => [
  { filename: 'Marie_2.md', markdown: '# Marie\n{BLOK B_Marie_2_X}' },
  { filename: 'Mirek_2.md', markdown: '# Mirek' },
  { filename: 'SrdceParty_2.md', markdown: '# Srdce party' },
]
