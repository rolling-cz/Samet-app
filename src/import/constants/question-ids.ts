/** Deriving question and answer IDs the author left empty (§4.2, §6.1). */

/** `Q_<Postava>_<Kapitola>_<Poradi>`; `<Poradi>` restarts at 1 per character and chapter. */
export const questionId = (character: string, chapter: number, ordinal: number): string =>
  `Q_${character}_${chapter}_${ordinal}`

/**
 * `A_<Postava>_<Kapitola>_<Poradi>_<Hodnota>`.
 *
 * For a `bool` question `<Hodnota>` is the answer's own text, so
 * `A_Marie_1_2_Ano` is recognisable in a condition without looking the question
 * up (§6.1).
 */
export const answerId = (
  character: string,
  chapter: number,
  ordinal: number,
  value: string,
): string => `A_${character}_${chapter}_${ordinal}_${value}`

/** The first ordinal of a character's chapter; the count includes org and poll votes. */
export const FIRST_QUESTION_ORDINAL = 1
