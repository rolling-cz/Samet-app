import { boolOptionLabel } from '../constants/bool-options'
import type { ConfigRows } from '../types/config-rows'

type QuestionRow = Pick<ConfigRows['questions'][number], 'type'>
type OptionRow = ConfigRows['answerOptions'][number]

const byOrdinal = (a: OptionRow, b: OptionRow): number => a.ordinal - b.ordinal

/**
 * Which options the answer stands for. Nothing is repaired: an answer with no
 * value yields no option, and the engine says what is wrong with it (§6.3).
 */
export const answeredOptions = (
  question: QuestionRow,
  boolValue: boolean | null,
  ownOptions: readonly OptionRow[],
  chosen: readonly OptionRow[],
): OptionRow[] => {
  switch (question.type) {
    case 'bool': {
      if (boolValue === null) return []
      const label = boolOptionLabel(boolValue)

      return ownOptions.filter((option) => option.label === label)
    }
    // The number is the answer; the question's one option only carries `=VALUE` (§6.7).
    case 'scale_direct':
    case 'resource_direct':
      return [...ownOptions]
    default:
      return [...chosen].sort(byOrdinal)
  }
}
