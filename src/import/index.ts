/** Config import (§10.1) — public surface for the rest of the app. */
export { importWorkbook, importXlsx } from './import-config'
export { IssueCollector } from './issue-collector'
export { persistConfig, type PersistInput, type PersistResult } from './persist/persist-config'
export { isConfigFrozen } from './persist/is-config-frozen'
export { parseConfig, unknownSheets } from './parse/parse-config'
export { validateConfig, type ValidationInput } from './validate/validate-config'
export { readTemplateFiles, templateCoverage, type RawFile, type TemplateAssignment, type TemplateCoverage } from './template-upload'
export { parseScaleImpact, splitImpactId, literalAmount, inputKeys } from './scale-impact'
export type { ImpactKind, ImpactTerm, ScaleImpact } from './scale-impact'
export { parseCondition, DEFAULT_CONDITION } from './expression'
export { parseTemplate, parseTemplateFilename, blockMarkers, KNOWN_VARIABLES } from './template'
export { readWorkbook } from './workbook'
export { columnLetter } from './utils/column-letter'
export { editDistance, suggestClosest } from './utils/suggest-closest'
export type { Issue, IssueCode, IssueLocation, IssueSeverity } from './types/issue'
export type { ImportResult } from './types/import-result'
export type { ImportRepairs, ParsedConfig, Workbook } from './types/parsed-config'
export type { ParsedCharacter } from './types/parsed-character'
export type { ParsedScaleRow } from './types/parsed-scale'
export type { ParsedResourceRow } from './types/parsed-resource'
export type { ParsedGroup } from './types/parsed-group'
export type {
  ParsedAnswerEffect,
  ParsedAnswerOption,
  ParsedQuestion,
  ParsedQuestionType,
} from './types/parsed-question'
export type { ParsedBlock, ParsedVariation } from './types/parsed-block'
export type { ParsedTemplate, UploadedTemplate } from './types/parsed-template'
export type { UploadedFile } from './types/uploaded-file'
