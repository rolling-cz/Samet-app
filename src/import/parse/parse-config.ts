/**
 * Workbook to `ParsedConfig` (§4.2, §10.1).
 *
 * The parser never throws on bad content and never stops at the first problem:
 * a broken config must not take the application down, and the author wants all
 * twenty typos in one round. Everything it cannot read becomes an issue and the
 * parse continues with what is left.
 */
import { buildAliases } from '../characters'
import { collectDefaultHouseholds } from '../households'
import {
  CHAPTER_SHEET_KINDS,
  CHAPTERS,
  chapterSheetName,
  CHARACTERS_SHEET,
  GROUPS_SHEET,
  IGNORED_SHEETS,
  RESOURCES_SHEET,
  SCALES_SHEET,
  VALIDATIONS_SHEET,
} from '../constants/sheets'
import type { IssueCollector } from '../issue-collector'
import type { ParsedBlock } from '../types/parsed-block'
import type { ImportRepairs, ParsedConfig, Workbook } from '../types/parsed-config'
import type { ParsedQuestion } from '../types/parsed-question'
import { parseCharacters } from './parse-characters'
import { parseContent } from './parse-content'
import { parseGroups } from './parse-groups'
import { parseQuestions } from './parse-questions'
import { parseResources } from './parse-resources'
import { parseScales } from './parse-scales'

export const parseConfig = (workbook: Workbook, issues: IssueCollector): ParsedConfig => {
  const repairs: ImportRepairs = {
    trimmedCells: 0,
    filledDownCells: 0,
    skippedEmptyRows: 0,
    resolvedCharacterNames: 0,
    derivedQuestionIds: 0,
    derivedAnswerIds: 0,
    addedBoolAnswers: 0,
    semicolonSeparators: 0,
  }

  const characters = parseCharacters(workbook, issues, repairs)
  const aliases = buildAliases(characters)
  const households = collectDefaultHouseholds(characters)

  const groups = parseGroups(workbook, issues, repairs)

  const chapters = CHAPTERS.filter((chapter) =>
    CHAPTER_SHEET_KINDS.some((kind) => workbook.has(chapterSheetName(chapter, kind))),
  )

  const questions = new Map<number, ParsedQuestion[]>()
  const blocks = new Map<number, ParsedBlock[]>()

  for (const chapter of chapters) {
    const chapterQuestions = parseQuestions(workbook, chapter, aliases, issues, repairs)
    repairs.derivedQuestionIds += chapterQuestions.filter((q) => q.idWasDerived).length
    repairs.addedBoolAnswers += chapterQuestions.reduce(
      (total, question) => total + question.options.filter((option) => option.isDerived).length,
      0,
    )
    questions.set(chapter, chapterQuestions)
    blocks.set(chapter, parseContent(workbook, chapter, aliases, groups, issues, repairs))
  }

  return {
    chapters: [...chapters],
    characters,
    households,
    groups,
    scales: parseScales(workbook, aliases, issues, repairs),
    resources: parseResources(workbook, aliases, issues, repairs),
    questions,
    blocks,
    sheetNames: [...workbook.keys()],
    repairs,
  }
}

/** Sheets the import does not read, so the report can say what it ignored. */
export const unknownSheets = (workbook: Workbook): string[] => {
  const known = new Set<string>([
    CHARACTERS_SHEET,
    GROUPS_SHEET,
    SCALES_SHEET,
    RESOURCES_SHEET,
    VALIDATIONS_SHEET,
    ...IGNORED_SHEETS,
  ])
  for (const chapter of CHAPTERS) {
    for (const kind of CHAPTER_SHEET_KINDS) known.add(chapterSheetName(chapter, kind))
  }

  return [...workbook.keys()].filter((name) => !known.has(name))
}
