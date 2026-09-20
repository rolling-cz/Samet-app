/**
 * Which questions of a chapter are asked (§4.5). A lookup, not an evaluation:
 * a question without a `Condition` always is; otherwise its variant must be
 * among the ones selected for its character when the chapter before was
 * computed. The catalog has already checked that the variant exists and
 * belongs to the same character and chapter.
 */
import type { Catalog } from '../catalog/buildCatalog'
import { fail } from '../errors/engineInputError'
import type { BlockDefinition } from '../types/block'
import type { VariationId } from '../types/ids'
import type { QuestionGate } from '../types/result'
import type { SelectedVariants } from '../types/state'
import type { QuestionGateTrace } from '../types/trace'

export interface QuestionGates {
  gates: QuestionGate[]
  traces: QuestionGateTrace[]
}

/** An owner nothing was selected for — the start of the run, or a group-only chapter. */
const NO_VARIANTS: ReadonlySet<VariationId> = Object.freeze(new Set<VariationId>())

/** A block returns one variant (§8.2); `null` while a missing roll leaves it undecided. */
const selectedOf = (block: BlockDefinition, selected: ReadonlySet<VariationId>): VariationId | null =>
  block.variations.find((variation) => selected.has(variation.id))?.id ?? null

export const gateQuestions = (catalog: Catalog, selected: SelectedVariants, chapter: number): QuestionGates => {
  const gates: QuestionGate[] = []
  const traces: QuestionGateTrace[] = []
  const selectedByCharacter = new Map<string, ReadonlySet<VariationId>>()
  for (const [characterId, variationIds] of Object.entries(selected.characters)) {
    selectedByCharacter.set(characterId, new Set(variationIds))
  }

  for (const question of catalog.config.questions) {
    // A poll is nobody's question and is never "asked" on its own (§6.6).
    if (question.chapter !== chapter || question.type === 'poll') continue

    const gate: QuestionGate = { questionId: question.id, asked: true }
    const trace: QuestionGateTrace = { phase: 'questions', kind: 'question', questionId: question.id, asked: true }
    if (question.characterId !== undefined) {
      gate.characterId = question.characterId
      trace.characterId = question.characterId
    }

    if (question.conditionVariationId !== undefined) {
      const block =
        catalog.variations.get(question.conditionVariationId)?.block ??
        fail('invalid_question_condition', question.id, `${question.conditionVariationId} is not a variant of any block`)
      // The catalog refuses a condition on a question without a character.
      const owned = (question.characterId === undefined ? undefined : selectedByCharacter.get(question.characterId)) ?? NO_VARIANTS

      gate.asked = owned.has(question.conditionVariationId)
      trace.asked = gate.asked
      trace.condition = {
        variationId: question.conditionVariationId,
        blockId: block.id,
        selectedVariationId: selectedOf(block, owned),
      }
    }

    gates.push(gate)
    traces.push(trace)
  }

  return { gates, traces }
}
