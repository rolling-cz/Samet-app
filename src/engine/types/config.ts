/**
 * Third argument of `evaluate`: the run's one config for all three chapters.
 *
 * A run has exactly one configuration, prepared whole in advance (§6.5) — no
 * versions, no activation, no diff of two imports.
 */
import type { BlockDefinition } from './block'
import type { CharacterDefinition, GroupDefinition } from './character'
import type { QuestionDefinition } from './question'
import type { ResourceDefinition } from './resource'
import type { ScaleDefinition } from './scale'

export interface EngineConfig {
  characters: CharacterDefinition[]
  groups: GroupDefinition[]
  /** One entry per pair character × scale (§4.2). */
  scales: ScaleDefinition[]
  /** One entry per pair owner × resource (§4.2). */
  resources: ResourceDefinition[]
  /** Every chapter: a condition may name an earlier chapter's answer. */
  questions: QuestionDefinition[]
  blocks: BlockDefinition[]
}
