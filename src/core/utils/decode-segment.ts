/**
 * Next hands dynamic segments over still percent-encoded, and a registry ID may
 * carry diacritics. A segment that does not decode is left as it is — it then
 * matches nothing and ends as not-found instead of a crash.
 */
export const decodeSegment = (segment: string): string => {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}
