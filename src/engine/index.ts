/**
 * Rules engine (§7) — a pure function, no database, network or React.
 *
 * `evaluate(state, inputs, config)` is the only entry point; everything else
 * here is the vocabulary its input and output are written in.
 */
export { evaluate } from './evaluate'
export { createInitialState } from './createInitialState'
export { EngineInputError, type EngineProblem, type EngineProblemCode } from './errors/engineInputError'
export * from './types/ids'
export * from './types/character'
export * from './types/scale'
export * from './types/resource'
export * from './types/impact'
export * from './types/effect'
export * from './types/question'
export * from './types/block'
export * from './types/config'
export * from './types/account'
export * from './types/source'
export * from './types/condition'
export * from './types/state'
export * from './types/input'
export * from './types/trace'
export * from './types/conflict'
export * from './types/result'
export * from './constants/effectPhases'
export * from './constants/expressionLanguage'
// The import's syntax check reads placeholders exactly as the engine does.
export { identifierName, isPlaceholder, parseExpressionTree } from './expression/parseExpressionTree'
export { householdExternalId } from './utils/householdId'
// Reading a resource the way a condition would: the document prints values the
// same rules chose the text by (§4.4).
export { characterResourceReference, routeResource } from './utils/resourceRouting'
export { readResource } from './utils/stateAccess'
export { splitHouseholdId } from './utils/splitHouseholdId'
export { normalizeState } from './utils/normalizeState'
export { compareIds } from './utils/compareIds'
export { ENGINE_VERSION } from './constants/engineVersion'
