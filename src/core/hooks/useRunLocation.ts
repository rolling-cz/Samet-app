'use client'

import { useSelectedLayoutSegments } from 'next/navigation'
import { useMemo } from 'react'
import type { RunLocation } from '../types/run-location'
import { parseRunLocation } from '../utils/parse-run-location'

/** Cannot occur inside a segment, so joining and splitting loses nothing. */
const SEGMENT_SEPARATOR = '/'

/**
 * Section, chapter and character of the current address. Only meaningful in
 * components rendered by the run layout: the segments are read below it.
 */
export const useRunLocation = (): RunLocation => {
  // The array is new on every render; the joined path keeps the result stable.
  const path = useSelectedLayoutSegments().join(SEGMENT_SEPARATOR)

  return useMemo(() => parseRunLocation(path.split(SEGMENT_SEPARATOR)), [path])
}
