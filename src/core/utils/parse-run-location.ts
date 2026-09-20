import { ADMIN_SECTION, CHAPTER_SEGMENT, DEFAULT_CHAPTER_SECTION, isChapterSection } from '../constants/routes'
import type { RunLocation } from '../types/run-location'
import { decodeSegment } from './decode-segment'
import { parseChapterNumber } from './parse-chapter-number'

/** Reads the path segments below `/beh/<runId>`; anything unrecognised is simply absent. */
export const parseRunLocation = (segments: readonly string[]): RunLocation => {
  const [first, chapterSegment, sectionSegment, characterSegment] = segments

  if (first === ADMIN_SECTION) return { section: ADMIN_SECTION }
  // An address without a chapter, which redirects to the default one.
  if (isChapterSection(first)) return { section: first }
  if (first !== CHAPTER_SEGMENT) return {}

  const location: RunLocation = {}
  const chapter = parseChapterNumber(chapterSegment)
  if (chapter !== undefined) location.chapter = chapter
  if (!isChapterSection(sectionSegment)) return location

  location.section = sectionSegment
  if (sectionSegment === DEFAULT_CHAPTER_SECTION && characterSegment !== undefined) {
    location.characterId = decodeSegment(characterSegment)
  }

  return location
}
