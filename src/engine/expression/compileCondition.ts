/**
 * Expression text to a resolved `CompiledCondition` (§4.5).
 *
 * An unknown scale, resource or anything without a known prefix is an error.
 * An unknown answer (`A_…`) or a `???` placeholder is not: the author fills one
 * character's sheet before the others exist, so it reads as "not chosen", the
 * import warns about each one and the trace marks it (organizer's decision,
 * 2026-09-25).
 */
import type jsep from 'jsep'
import type { Catalog } from '../catalog/buildCatalog'
import {
  AND_OPERATOR,
  ANSWER_PREFIX,
  COMPARISON_OPERATORS,
  DEFAULT_CONDITION,
  NOT_OPERATOR,
  OR_OPERATOR,
  RANDOM_FUNCTION,
  RANDOM_MAX_PERCENT,
  RANDOM_MIN_PERCENT,
  type ComparisonOperator,
} from '../constants/expressionLanguage'
import { fail } from '../errors/engineInputError'
import type { CompiledCondition, CompiledNumber } from '../types/condition'
import { splitImpactId } from '../utils/impactId'
import { identifierName, isPlaceholder, parseExpressionTree } from './parseExpressionTree'

export interface CompileScope {
  catalog: Catalog
  /** Variant the expression belongs to, for the error. */
  ownerId: string
}

interface NodeScope extends CompileScope {
  expression: string
  /** Next `RANDOM` occurrence, counted left to right from 0. */
  randomCount: { value: number }
}

/** An empty cell and `DEFAULT` are the same fallback (§8.2). */
export const compileCondition = (source: string | undefined, scope: CompileScope): CompiledCondition => {
  const expression = (source ?? '').trim()
  if (expression === '' || expression === DEFAULT_CONDITION) return { kind: 'always' }

  let tree: jsep.Expression
  try {
    tree = parseExpressionTree(expression)
  } catch (cause) {
    return fail('invalid_expression', scope.ownerId, `cannot parse "${expression}": ${String(cause)}`)
  }

  return toCondition(tree, { ...scope, expression, randomCount: { value: 0 } })
}

const invalid = (scope: NodeScope, detail: string): never =>
  fail('invalid_expression', scope.ownerId, `"${scope.expression}": ${detail}`)

const unknown = (scope: NodeScope, name: string, detail: string): never =>
  fail('unknown_identifier', scope.ownerId, `"${scope.expression}": ${name} ${detail}`)

const isComparison = (operator: string): operator is ComparisonOperator =>
  (COMPARISON_OPERATORS as readonly string[]).includes(operator)

const toCondition = (node: jsep.Expression, scope: NodeScope): CompiledCondition => {
  switch (node.type) {
    case 'Identifier':
      return identifierCondition(identifierName(node as jsep.Identifier), scope)
    case 'UnaryExpression': {
      const unary = node as jsep.UnaryExpression
      if (unary.operator !== NOT_OPERATOR) return invalid(scope, `unsupported operator ${unary.operator}`)

      return { kind: 'not', operand: toCondition(unary.argument, scope) }
    }
    case 'BinaryExpression': {
      const binary = node as jsep.BinaryExpression
      if (binary.operator === AND_OPERATOR || binary.operator === OR_OPERATOR) {
        const kind = binary.operator === AND_OPERATOR ? 'and' : 'or'
        // Left before right keeps `occurrence` in source order.
        const left = toCondition(binary.left, scope)
        const right = toCondition(binary.right, scope)

        return { kind, left, right }
      }
      if (isComparison(binary.operator)) {
        return {
          kind: 'compare',
          operator: binary.operator,
          left: toNumber(binary.left, scope),
          right: toNumber(binary.right, scope),
        }
      }

      return invalid(scope, `unsupported operator ${binary.operator}`)
    }
    case 'CallExpression':
      return randomCondition(node as jsep.CallExpression, scope)
    default:
      return invalid(scope, `${node.type} is not a condition`)
  }
}

const identifierCondition = (name: string, scope: NodeScope): CompiledCondition => {
  if (name === DEFAULT_CONDITION) return invalid(scope, `${DEFAULT_CONDITION} must stand alone`)

  if (isPlaceholder(name)) return { kind: 'unknown_answer', reference: name }

  if (name.startsWith(ANSWER_PREFIX)) {
    const entry = scope.catalog.options.get(name)
    if (entry === undefined) return { kind: 'unknown_answer', reference: name }
    // A poll's option holds when it won the poll, not when somebody voted for it (§6.6).
    if (entry.question.type === 'poll') {
      return { kind: 'poll', reference: name, pollId: entry.question.id, optionId: name }
    }

    return {
      kind: 'answer',
      reference: name,
      optionId: name,
      questionId: entry.question.id,
      questionChapter: entry.question.chapter,
    }
  }

  const parts = splitImpactId(name)
  if (parts?.kind === 'scale' && scope.catalog.scales.has(name)) {
    return invalid(scope, `scale ${name} must be compared with a number`)
  }
  if (parts?.kind === 'resource' && scope.catalog.resolveResource(parts.owner, parts.key, parts.forcedPrivate)) {
    return invalid(scope, `resource ${name} must be compared with a number`)
  }

  return unknown(scope, name, 'is not an answer, scale or resource')
}

const toNumber = (node: jsep.Expression, scope: NodeScope): CompiledNumber => {
  if (node.type === 'Literal' && typeof (node as jsep.Literal).value === 'number') {
    return { kind: 'number', value: (node as jsep.Literal).value as number }
  }
  if (node.type !== 'Identifier') return invalid(scope, 'a comparison takes a scale, a resource or a number on each side')

  const name = identifierName(node as jsep.Identifier)
  if (isPlaceholder(name)) return invalid(scope, `${name} is unfinished — only an answer may be left as ???`)
  const parts = splitImpactId(name) ?? unknown(scope, name, 'is not a scale or resource')

  if (parts.kind === 'scale') {
    const scale = scope.catalog.scales.get(name) ?? unknown(scope, name, 'is not a scale of that character')

    return { kind: 'scale', reference: name, characterId: scale.characterId, scaleKey: scale.key }
  }

  const owner =
    scope.catalog.resolveResource(parts.owner, parts.key, parts.forcedPrivate) ??
    unknown(scope, name, 'is not a resource of that character or household')

  return { kind: 'resource', reference: name, owner, resourceKey: parts.key }
}

const randomCondition = (call: jsep.CallExpression, scope: NodeScope): CompiledCondition => {
  const callee = call.callee.type === 'Identifier' ? String((call.callee as jsep.Identifier).name) : ''
  if (callee !== RANDOM_FUNCTION) return invalid(scope, `unknown function ${callee}`)

  const [argument, ...extra] = call.arguments
  const percent = argument?.type === 'Literal' ? (argument as jsep.Literal).value : undefined
  if (typeof percent !== 'number' || extra.length > 0) {
    return invalid(scope, `${RANDOM_FUNCTION} takes exactly one number`)
  }
  if (percent < RANDOM_MIN_PERCENT || percent > RANDOM_MAX_PERCENT) {
    return invalid(scope, `${RANDOM_FUNCTION}(${percent}) is outside ${RANDOM_MIN_PERCENT}–${RANDOM_MAX_PERCENT}`)
  }

  const occurrence = scope.randomCount.value
  scope.randomCount.value += 1

  return { kind: 'random', reference: `${RANDOM_FUNCTION}(${percent})`, percent, occurrence }
}
