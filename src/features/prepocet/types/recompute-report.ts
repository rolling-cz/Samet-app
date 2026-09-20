import type { ComputationOutcome } from '@/computation'

/** What the button shows: the core's outcome, or a failure that never reached it. */
export type RecomputeReport = ComputationOutcome | { _type: 'failed'; message: string }
