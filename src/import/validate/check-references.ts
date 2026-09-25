import type { ExpressionParse } from '../expression'
import type { IssueCollector } from '../issue-collector'
import type { IssueLocation } from '../types/issue'
import { suggestClosest } from '../utils/suggest-closest'

/** What a condition may name at a given point in the run. */
export interface ReferenceScope {
  chapter: number
  answerIds: Set<string>
  /** Every chapter's answers: a later chapter's is a real mistake, not a gap. */
  allAnswerIds: Set<string>
  scaleIds: Set<string>
  resourceIds: Set<string>
}

/**
 * §11.6d: an identifier a variant's condition invents is an error, never a
 * silent false — except an answer. One character's conditions are written
 * before the other characters' questions exist, so an unknown answer or a
 * `???` is a warning and reads as "not chosen" (organizer's decision,
 * 2026-09-25). The `Condition` column of `N_Questions` is not an expression
 * and has its own check (§4.5).
 */
export const checkConditionReferences = (
  condition: ExpressionParse,
  subject: string,
  location: IssueLocation,
  scope: ReferenceScope,
  issues: IssueCollector,
): void => {
  for (const reference of condition.references) {
    switch (reference.kind) {
      case 'answer':
        // A poll's winning answer is spelled like any other answer (§6.6), so
        // one lookup covers both.
        if (scope.answerIds.has(reference.name)) break
        if (scope.allAnswerIds.has(reference.name)) {
          issues.error(
            'unknown_answer',
            location,
            `${subject} odkazuje na odpověď \`${reference.name}\` z pozdější kapitoly — v kapitole ${scope.chapter} ještě nikdo neodpověděl.`,
            { value: reference.name },
          )
          break
        }
        issues.warn(
          'unknown_answer',
          location,
          `${subject} odkazuje na odpověď \`${reference.name}\`, která zatím neexistuje v kapitole ${scope.chapter} ani v žádné dřívější. Než ji doplníš, počítá se jako nevybraná.`,
          { value: reference.name, suggestion: suggestClosest(reference.name, scope.answerIds) },
        )
        break
      case 'placeholder':
        issues.warn(
          'unfinished_condition',
          location,
          `${subject} má nedopsaný odkaz \`${reference.name}\`. Než ho doplníš, počítá se jako nevybraná odpověď.`,
          { value: reference.name },
        )
        break
      case 'scale':
        if (!scope.scaleIds.has(reference.name)) {
          issues.error(
            'unknown_scale',
            location,
            `${subject} odkazuje na škálu \`${reference.name}\`, která není v listu \`Scales\`.`,
            { value: reference.name, suggestion: suggestClosest(reference.name, scope.scaleIds) },
          )
        }
        break
      case 'resource':
        if (!scope.resourceIds.has(reference.name)) {
          issues.error(
            'unknown_resource',
            location,
            `${subject} odkazuje na zdroj \`${reference.name}\`, který není v listu \`Resources\`.`,
            { value: reference.name, suggestion: suggestClosest(reference.name, scope.resourceIds) },
          )
        }
        break
      default:
        issues.error(
          'invalid_expression',
          location,
          `${subject} odkazuje na \`${reference.name}\`, což není ani odpověď (\`A_\`), ani škála (\`S_\`), ani zdroj (\`R_\`).`,
          { value: reference.name },
        )
    }
  }
}

/** Answers a chapter's conditions may name: its own and every earlier one's. */
export const answersUpTo = (
  questions: Map<number, { options: { externalId: string }[] }[]>,
  chapter: number,
): Set<string> => {
  const answerIds = new Set<string>()

  for (const [questionChapter, list] of questions) {
    if (questionChapter > chapter) continue
    for (const question of list) {
      for (const option of question.options) answerIds.add(option.externalId)
    }
  }

  return answerIds
}
