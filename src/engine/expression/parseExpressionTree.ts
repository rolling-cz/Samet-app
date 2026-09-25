/**
 * The parser is a library (`jsep`), never a hand-written grammar (§4.5). The
 * import registers the same operators for its syntax check; both must read an
 * expression the same way.
 */
import jsep from 'jsep'
import {
  AND_OPERATOR,
  AND_PRECEDENCE,
  OR_OPERATOR,
  OR_PRECEDENCE,
  PLACEHOLDER_MARK,
} from '../constants/expressionLanguage'

// jsep keeps operators globally; registering at module load covers every caller.
jsep.addBinaryOp(AND_OPERATOR, AND_PRECEDENCE)
jsep.addBinaryOp(OR_OPERATOR, OR_PRECEDENCE)

/** The author's lone `=` becomes jsep's `==`; `<=`, `>=`, `!=` and `==` stay. */
const normalizeEquals = (source: string): string => source.replace(/(^|[^<>=!])=(?!=)/g, '$1==')

/**
 * jsep reads `?` as the ternary operator, so a placeholder is swapped for a
 * character jsep accepts inside an identifier (anything above ASCII) and
 * swapped back when the identifier is read.
 */
const PLACEHOLDER_STAND_IN = '⁇'

/** Throws jsep's error on bad syntax; callers word it for their audience. */
export const parseExpressionTree = (source: string): jsep.Expression =>
  jsep(normalizeEquals(source).replaceAll(PLACEHOLDER_MARK, PLACEHOLDER_STAND_IN))

/** An identifier's name as the author wrote it. */
export const identifierName = (node: jsep.Identifier): string =>
  String(node.name).replaceAll(PLACEHOLDER_STAND_IN, PLACEHOLDER_MARK)

/** `A_Ivan_1_???_Dari_Ne` or a bare `???`: a reference still to be written. */
export const isPlaceholder = (name: string): boolean => name.includes(PLACEHOLDER_MARK)
