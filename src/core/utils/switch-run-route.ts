import type { Route } from 'next'
import { ADMIN_SECTION, adminRoute, chapterRoute, runHomeRoute } from '../constants/routes'
import type { RunLocation } from '../types/run-location'

/**
 * The same section and chapter of another run. The character is dropped:
 * registry IDs need not match across runs.
 */
export const switchRunRoute = (location: RunLocation, nextRunId: string): Route => {
  if (location.section === ADMIN_SECTION) return adminRoute(nextRunId)
  // Without a chapter in the address the other run picks its own default.
  if (location.section === undefined || location.chapter === undefined) return runHomeRoute(nextRunId)

  return chapterRoute(nextRunId, location.chapter, location.section)
}
