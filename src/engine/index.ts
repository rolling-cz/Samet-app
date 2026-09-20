/**
 * Rules engine (§7) — a pure function, no database, network or React.
 *
 * Only the types exist so far; `evaluate` itself comes later (§15.1).
 */
export * from './types/ids'
export * from './types/scale'
export * from './types/character'
export * from './types/question'
export * from './types/effect'
export * from './types/rule'
export * from './types/state'
export * from './types/input'
export * from './types/trace'
export * from './types/result'
export * from './constants/effectPhases'
export * from './utils/householdId'
export { ENGINE_VERSION } from './constants/engineVersion'
