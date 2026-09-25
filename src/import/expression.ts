/**
 * Conditions from the `Conditions` column (§4.5, §8.2).
 *
 * The author writes them as expressions in one cell, so the parser is a library
 * (`jsep`) and never a hand-written grammar. This session only reads, stores
 * and syntax-checks them — evaluation is the engine's job (§7), and the tree
 * produced here is what it will walk.
 *
 * Language (§4.5): identifiers `A_…` answer, `S_…` scale, `R_…` resource,
 * `AND` / `OR`, `!`, parentheses, comparisons, `RANDOM(50)` and `DEFAULT`.
 * An identifier may also be a poll's winning answer, which is spelled like any
 * other answer (§6.6).
 */
import type jsep from 'jsep'
import { AND_OPERATOR, identifierName, isPlaceholder, OR_OPERATOR, parseExpressionTree } from '@/engine'

/**
 * Always-true fallback variant (§8.2); it stands last and is not an expression.
 *
 * An empty cell means exactly the same thing, so nothing downstream may tell
 * the two apart.
 */
export const DEFAULT_CONDITION = 'DEFAULT'

/** `placeholder` is a `???` the author has yet to replace with a real ID. */
export type ReferenceKind = 'answer' | 'scale' | 'resource' | 'placeholder' | 'unknown'

export interface ExpressionReference {
  name: string
  kind: ReferenceKind
}

export interface ExpressionParse {
  /** The source text, trimmed. */
  raw: string
  /** True for the `DEFAULT` variant, which has no condition to check. */
  isDefault: boolean
  ok: boolean
  /** Czech description of the syntax problem, ready for an issue message. */
  error?: string
  /** Identifiers the expression mentions, deduplicated, in order of appearance. */
  references: ExpressionReference[]
  /** True when the expression uses `RANDOM(…)`, so a roll has to be stored (§7.4). */
  usesRandom: boolean
  /** Parsed tree, kept for the engine; undefined when parsing failed. */
  tree?: jsep.Expression
}

/** ID prefixes from §4.2; anything else is reported rather than guessed at. */
const classify = (name: string): ReferenceKind => {
  if (isPlaceholder(name)) return 'placeholder'
  if (name.startsWith('A_')) return 'answer'
  if (name.startsWith('S_')) return 'scale'
  if (name.startsWith('R_')) return 'resource'

  return 'unknown'
}

/** The only function a condition may call (§4.5). */
const CALL_WHITELIST = Object.freeze(new Set(['RANDOM']))

/** `RANDOM(n)` takes a probability in percent. */
const RANDOM_MIN_PERCENT = 0

const RANDOM_MAX_PERCENT = 100

export const parseCondition = (cell: string | undefined | null): ExpressionParse => {
  const raw = (cell ?? '').trim()

  // An empty cell and `DEFAULT` mean the same thing (§4.5, §8.2): the
  // always-true fallback. Treating an empty cell as an error would reject the
  // way the author writes the last variant of most blocks.
  if (raw === '' || raw === DEFAULT_CONDITION) {
    return { raw, isDefault: true, ok: true, references: [], usesRandom: false }
  }

  let tree: jsep.Expression
  try {
    tree = parseExpressionTree(raw)
  } catch (cause) {
    return {
      raw,
      isDefault: false,
      ok: false,
      error: describeSyntaxError(raw, cause),
      references: [],
      usesRandom: false,
    }
  }

  const references: ExpressionReference[] = []
  const seen = new Set<string>()
  let usesRandom = false
  let error: string | undefined

  const visit = (node: jsep.Expression): void => {
    switch (node.type) {
      case 'Identifier': {
        const name = identifierName(node as jsep.Identifier)
        if (name === DEFAULT_CONDITION) {
          // `DEFAULT` inside a bigger expression is meaningless — it is always
          // true, so the rest of the expression could never change the outcome.
          error ??= '`DEFAULT` smí stát jen samostatně, ne uvnitř výrazu'

          return
        }
        if (!seen.has(name)) {
          seen.add(name)
          references.push({ name, kind: classify(name) })
        }

        return
      }
      case 'CallExpression': {
        const call = node as jsep.CallExpression
        const callee = call.callee.type === 'Identifier' ? String((call.callee as jsep.Identifier).name) : '?'
        if (!CALL_WHITELIST.has(callee)) {
          error ??= `neznámá funkce \`${callee}\` — k dispozici je jen \`RANDOM(<procenta>)\``

          return
        }
        usesRandom = true
        const [probability, ...extra] = call.arguments
        if (probability === undefined || extra.length > 0) {
          error ??= '`RANDOM` bere právě jeden argument, pravděpodobnost v procentech'

          return
        }
        if (probability.type !== 'Literal' || typeof (probability as jsep.Literal).value !== 'number') {
          error ??= '`RANDOM` bere číslo v procentech, například `RANDOM(50)`'

          return
        }
        const value = (probability as jsep.Literal).value as number
        if (value < RANDOM_MIN_PERCENT || value > RANDOM_MAX_PERCENT) {
          error ??= `\`RANDOM(${value})\` je mimo rozsah — pravděpodobnost je ${RANDOM_MIN_PERCENT} až ${RANDOM_MAX_PERCENT} procent`
        }

        return
      }
      case 'BinaryExpression': {
        const binary = node as jsep.BinaryExpression
        // Only an answer may wait for its `???`: a comparison has no "not chosen" to fall back on.
        const operand = [binary.left, binary.right].find(
          (side) => side.type === 'Identifier' && isPlaceholder(identifierName(side as jsep.Identifier)),
        )
        if (operand && binary.operator !== AND_OPERATOR && binary.operator !== OR_OPERATOR) {
          error ??= `\`${identifierName(operand as jsep.Identifier)}\` v porovnání musí být dopsaná škála nebo zdroj — \`???\` smí jen místo odpovědi`
        }
        visit(binary.left)
        visit(binary.right)

        return
      }
      case 'UnaryExpression': {
        visit((node as jsep.UnaryExpression).argument)

        return
      }
      case 'Compound': {
        // jsep produces a Compound for two expressions with nothing joining
        // them — almost always a missing AND / OR.
        error ??= 'dva výrazy za sebou bez spojky — chybí `AND` nebo `OR`'

        return
      }
      case 'Literal':
        return
      default:
        error ??= `neznámá konstrukce ve výrazu (\`${node.type}\`)`
    }
  }

  visit(tree)

  if (error) {
    return { raw, isDefault: false, ok: false, error, references, usesRandom, tree }
  }

  return { raw, isDefault: false, ok: true, references, usesRandom, tree }
}

/**
 * jsep's own message names a character offset, which the author cannot use.
 * An unbalanced parenthesis is the common case and worth naming outright — the
 * sample sheet already contains one.
 */
const describeSyntaxError = (raw: string, cause: unknown): string => {
  const open = (raw.match(/\(/g) ?? []).length
  const close = (raw.match(/\)/g) ?? []).length
  if (open > close) {
    return `chybí ${open - close}× uzavírací závorka )`
  }
  if (close > open) {
    return `přebývá ${close - open}× uzavírací závorka )`
  }
  const detail = cause instanceof Error ? cause.message : String(cause)

  return `výraz se nedá přečíst: ${detail}`
}
