/**
 * Whether the chapter's newest computation still reflects its answers (§3.2).
 * The app only says so — it never recomputes on its own.
 */
export type ChapterStaleness =
  | { _type: 'not_computed' }
  | { _type: 'fresh' }
  | { _type: 'stale'; computedAt: string; answersChangedAt: string }
