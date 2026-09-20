import { BOOL_ANSWER_TEXTS } from '@/import/constants/sheet-vocabulary'

const [YES_LABEL, NO_LABEL] = BOOL_ANSWER_TEXTS

/** A `bool` answer is stored as a boolean; its option is the row labelled `Ano` or `Ne` (§4.2). */
export const boolOptionLabel = (value: boolean): string => (value ? YES_LABEL : NO_LABEL)
