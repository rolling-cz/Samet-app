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
export { householdExternalId } from './utils/householdId'
export { splitHouseholdId } from './utils/splitHouseholdId'
export { ENGINE_VERSION } from './constants/engineVersion'
