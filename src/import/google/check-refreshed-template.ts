/**
 * Whether a tab refreshed from Google may replace the template in use (§10.2).
 *
 * The refresh bypasses the upload form, but not its checks: the candidate is
 * checked against the archived config together with every other template in
 * use, and only the errors it **adds** count. Errors that were there before —
 * in someone else's template — are not the refresh's to answer for, and must
 * not block fixing one document. The config itself does not change, so only
 * the template checks are run.
 */
import { IssueCollector } from '../issue-collector'
import { templateKey } from '../template-upload'
import type { ParsedConfig } from '../types/parsed-config'
import type { ParsedTemplate } from '../types/parsed-template'
import { checkTemplates } from '../validate/check-templates'

const templateErrors = (config: ParsedConfig, templates: ParsedTemplate[]): string[] => {
  const issues = new IssueCollector()
  checkTemplates(config, templates, issues)

  return issues.errors.map((issue) => issue.message)
}

/** The errors of the templates in use — computed once per batch, not per tab. */
export const templateErrorBaseline = (config: ParsedConfig, inUse: readonly ParsedTemplate[]): ReadonlySet<string> =>
  new Set(templateErrors(config, [...inUse]))

const keyOf = (template: ParsedTemplate): string => templateKey(template.ownerRef ?? '', template.chapter ?? 0)

/** The messages of the errors the candidate would introduce; empty = it may be used. */
export const refreshedTemplateErrors = (
  config: ParsedConfig,
  inUse: readonly ParsedTemplate[],
  candidate: ParsedTemplate,
  baseline: ReadonlySet<string> = templateErrorBaseline(config, inUse),
): string[] => {
  const replaced = [...inUse.filter((template) => keyOf(template) !== keyOf(candidate)), candidate]

  return templateErrors(config, replaced).filter((message) => !baseline.has(message))
}
