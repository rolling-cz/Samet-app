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
} from '../constants/expressionLanguage'

// jsep keeps operators globally; registering at module load covers every caller.
jsep.addBinaryOp(AND_OPERATOR, AND_PRECEDENCE)
jsep.addBinaryOp(OR_OPERATOR, OR_PRECEDENCE)

/** The author's lone `=` becomes jsep's `==`; `<=`, `>=`, `!=` and `==` stay. */
const normalizeEquals = (source: string): string => source.replace(/(^|[^<>=!])=(?!=)/g, '$1==')

/** Throws jsep's error on bad syntax; callers word it for their audience. */
export const parseExpressionTree = (source: string): jsep.Expression => jsep(normalizeEquals(source))
