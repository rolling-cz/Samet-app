import { MAX_STORED_INTEGER, SIGNED_WHOLE_NUMBER, UNSIGNED_WHOLE_NUMBER } from '../constants/number-input'
import type { WholeNumber } from '../types/whole-number'

/** An empty field is not a zero: it is a value nobody entered (§4.4). */
export const parseWholeNumber = (text: string, allowNegative: boolean): WholeNumber => {
  const trimmed = text.trim()
  if (trimmed === '') return { _type: 'empty' }
  if (!(allowNegative ? SIGNED_WHOLE_NUMBER : UNSIGNED_WHOLE_NUMBER).test(trimmed)) return { _type: 'invalid' }

  const value = Number(trimmed)
  if (Math.abs(value) > MAX_STORED_INTEGER) return { _type: 'invalid' }

  // `-0` would read as a negative in the audit.
  return { _type: 'valid', value: value === 0 ? 0 : value }
}
