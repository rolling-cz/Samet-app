import type { computations } from '@/db/schema'

export type ComputationSummary = Pick<typeof computations.$inferSelect, 'id' | 'version' | 'status' | 'isReleased'>
