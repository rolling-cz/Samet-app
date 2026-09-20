/**
 * One variant per block of the next chapter's documents, read over the
 * finished state (§8.2): ascending priority — row order when no variant has one
 * — and the first condition that holds wins. Priority decides completely, so
 * variants never conflict.
 *
 * A nested block is a block like any other and gets its own selection; the
 * document layer substitutes the markers (§8.4).
 */
import type { EvaluationContext } from '../evaluationContext'
import { fail } from '../errors/engineInputError'
import { compileCondition } from '../expression/compileCondition'
import { environmentFor, type EnvironmentScope } from '../expression/conditionEnvironment'
import { evaluateCondition } from '../expression/evaluateCondition'
import type { BlockDefinition, VariationDefinition } from '../types/block'
import type { CompiledCondition } from '../types/condition'
import { NEXT_CHAPTER_OFFSET } from '../types/ids'
import type { RollOwner } from '../types/input'
import type { VariantSelection } from '../types/result'
import type { VariationEvaluation } from '../types/trace'
import { compareIds } from '../utils/compareIds'

const rollOwnerOf = (block: BlockDefinition): RollOwner => {
  if (block.characterId !== undefined) return { ownerKind: 'character', ownerId: block.characterId }
  if (block.groupId !== undefined) return { ownerKind: 'group', ownerId: block.groupId }

  return fail('unknown_reference', block.id, 'block has no owner')
}

/** Priority when any variant has one, row order otherwise (§8.2). */
const orderedVariations = (block: BlockDefinition): VariationDefinition[] => {
  const prioritised = block.variations.some((variation) => variation.priority !== undefined)

  return [...block.variations].sort((a, b) => {
    if (prioritised) {
      const byPriority = (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER)
      if (byPriority !== 0) return byPriority
    }

    return a.ordinal - b.ordinal
  })
}

const percentsOf = (condition: CompiledCondition, into: Map<number, number>): void => {
  switch (condition.kind) {
    case 'random':
      into.set(condition.occurrence, condition.percent)

      return
    case 'not':
      percentsOf(condition.operand, into)

      return
    case 'and':
    case 'or':
      percentsOf(condition.left, into)
      percentsOf(condition.right, into)

      return
    default:
      return
  }
}

const selectVariant = (context: EvaluationContext, scope: EnvironmentScope, block: BlockDefinition): VariantSelection => {
  const owner = rollOwnerOf(block)
  const evaluations: VariationEvaluation[] = []
  const selection: VariantSelection = { blockId: block.id, status: 'selected', variationId: null, text: null }
  if (block.characterId !== undefined) selection.characterId = block.characterId
  if (block.groupId !== undefined) selection.groupId = block.groupId

  for (const variation of orderedVariations(block)) {
    const condition = compileCondition(variation.condition, { catalog: context.catalog, ownerId: variation.id })
    const percents = new Map<number, number>()
    percentsOf(condition, percents)

    const outcome = evaluateCondition(
      condition,
      environmentFor(scope, {
        owner,
        variationId: variation.id,
        rolls: context.rolls,
        missingRolls: context.missingRolls,
        percentOf: (occurrence) => percents.get(occurrence) ?? 0,
      }),
    )
    const evaluation: VariationEvaluation = { variationId: variation.id, ordinal: variation.ordinal, result: outcome.result, readings: outcome.readings }
    if (variation.priority !== undefined) evaluation.priority = variation.priority
    evaluations.push(evaluation)
    if (outcome.result === 'fails') continue

    // Unknown stops the walk: until the roll is stored, nobody knows whether
    // this variant applies, and the ones behind it must not be read (§7.4).
    const decided = outcome.result === 'holds'
    context.trace.push({
      phase: 'variants',
      kind: 'variant',
      blockId: block.id,
      ...(block.characterId !== undefined ? { characterId: block.characterId } : {}),
      ...(block.groupId !== undefined ? { groupId: block.groupId } : {}),
      variationId: decided ? variation.id : null,
      evaluations,
    })
    if (decided) {
      selection.variationId = variation.id
      selection.text = variation.text
    } else {
      selection.status = 'undecided'
    }

    return selection
  }

  return fail('block_without_result', block.id, 'no variant holds and there is no DEFAULT')
}

export const selectVariants = (context: EvaluationContext, scope: EnvironmentScope): VariantSelection[] => {
  const nextChapter = context.chapter + NEXT_CHAPTER_OFFSET

  return context.catalog.config.blocks
    .filter((block) => block.chapter === nextChapter)
    .sort((a, b) => compareIds(a.id, b.id))
    .map((block) => selectVariant(context, scope, block))
}
