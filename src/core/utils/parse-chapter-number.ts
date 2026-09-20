/** No sign, no leading zero, no decimals: `/kapitola/02` is not a second address of chapter 2. */
const CHAPTER_NUMBER_PATTERN = /^[1-9]\d*$/

/** Only the shape; whether the run has such a chapter is the caller's check. */
export const parseChapterNumber = (segment: string | undefined): number | undefined =>
  segment !== undefined && CHAPTER_NUMBER_PATTERN.test(segment) ? Number(segment) : undefined
