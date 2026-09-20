import type { ExpressionParse } from '../expression'
import type { IssueCollector } from '../issue-collector'
import type { IssueLocation } from '../types/issue'
import { suggestClosest } from '../utils/suggest-closest'

/** What a condition may name at a given point in the run. */
export interface ReferenceScope {
  chapter: number
  answerIds: Set<string>
  scaleIds: Set<string>
  resourceIds: Set<string>
}

/**
 * §11.6d: an identifier a condition invents is an error, never a silent false.
 *
 * Shared by block variants and by the question-level `Condition` column,
 * because the language is the same in both places (§4.5) and so is the mistake
 * the author makes.
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
      case 'odpoved':
        // A poll's winning answer is spelled like any other answer (§6.6), so
        // one lookup covers both.
        if (!scope.answerIds.has(reference.name)) {
          issues.error(
            'neznama_odpoved',
            location,
            `${subject} odkazuje na odpověď \`${reference.name}\`, která neexistuje v kapitole ${scope.chapter} ani v žádné dřívější.`,
            { value: reference.name, suggestion: suggestClosest(reference.name, scope.answerIds) },
          )
        }
        break
      case 'skala':
        if (!scope.scaleIds.has(reference.name)) {
          issues.error(
            'neznama_skala',
            location,
            `${subject} odkazuje na škálu \`${reference.name}\`, která není v listu \`Scales\`.`,
            { value: reference.name, suggestion: suggestClosest(reference.name, scope.scaleIds) },
          )
        }
        break
      case 'zdroj':
        if (!scope.resourceIds.has(reference.name)) {
          issues.error(
            'neznamy_zdroj',
            location,
            `${subject} odkazuje na zdroj \`${reference.name}\`, který není v listu \`Resources\`.`,
            { value: reference.name, suggestion: suggestClosest(reference.name, scope.resourceIds) },
          )
        }
        break
      default:
        issues.error(
          'vadny_vyraz',
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
