import type { ComputationSummary } from '../types/baseline'

/**
 * The computation the next chapter starts from: the released one, otherwise the
 * last confirmed. Never a draft — a draft is a dry-run, and building a chapter
 * on it would hand players questions nobody agreed to.
 */
export const pickBaseline = (computations: readonly ComputationSummary[]): ComputationSummary | undefined => {
  const released = computations.find((computation) => computation.isReleased)
  if (released) return released

  let latest: ComputationSummary | undefined
  for (const computation of computations) {
    if (computation.status !== 'confirmed') continue
    if (latest === undefined || computation.version > latest.version) latest = computation
  }

  return latest
}
