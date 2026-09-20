import type { OptionView, QuestionView } from '@/computation'
import { boolOptionLabel } from '@/computation/constants/bool-options'

/** The `Ano` / `Ne` rows of a `bool` question, told apart by their text as the import does (§6.1). */
export const boolOptions = (question: QuestionView): { yes?: OptionView; no?: OptionView } => ({
  yes: question.options.find((option) => option.label === boolOptionLabel(true)),
  no: question.options.find((option) => option.label === boolOptionLabel(false)),
})
