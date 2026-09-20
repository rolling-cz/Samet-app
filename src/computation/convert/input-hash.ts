import { createHash } from 'node:crypto'
import { compareIds, type EngineConfig, type EvaluationInputs, type RunState } from '@/engine'

const HASH_ALGORITHM = 'sha256'

/** Object keys sorted at every level, so the same data always serialises to the same text. */
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical)
  if (typeof value !== 'object' || value === null) return value

  const sorted: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value).sort(([a], [b]) => compareIds(a, b))) {
    sorted[key] = canonical(entry)
  }

  return sorted
}

/**
 * Fingerprint of everything `evaluate` was given (§2). The same fingerprint
 * with a different result is an alarm: the engine is not deterministic, or its
 * version changed underneath.
 */
export const inputHash = (state: RunState, inputs: EvaluationInputs, config: EngineConfig): string =>
  createHash(HASH_ALGORITHM).update(JSON.stringify(canonical({ state, inputs, config }))).digest('hex')
