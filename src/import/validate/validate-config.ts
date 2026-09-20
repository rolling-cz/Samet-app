/**
 * Consistency checks over a parsed config (§11).
 *
 * Errors block the config from being used; warnings let it through. Nothing
 * here throws: the point is to hand the author the whole list at once.
 */
import type { IssueCollector } from '../issue-collector'
import type { ParsedConfig } from '../types/parsed-config'
import type { ParsedTemplate } from '../types/parsed-template'
import { checkCharacters } from './check-characters'
import { checkContent } from './check-content'
import { checkQuestions } from './check-questions'
import { checkUntouchedScales } from './check-scale-usage'
import { checkScales } from './check-scales'
import { checkTemplates } from './check-templates'

export interface ValidationInput {
  config: ParsedConfig
  /** Templates uploaded so far; validating without them skips the marker checks. */
  templates?: ParsedTemplate[]
}

export const validateConfig = ({ config, templates }: ValidationInput, issues: IssueCollector): void => {
  const characterIds = new Set(config.characters.map((c) => c.externalId))
  const groupIds = new Set(config.groups.map((g) => g.externalId))

  checkCharacters(config, issues)
  checkScales(config, issues)
  checkQuestions(config, characterIds, groupIds, issues)
  checkContent(config, characterIds, groupIds, issues)
  checkUntouchedScales(config, issues)
  if (templates) checkTemplates(config, templates, issues)
}
