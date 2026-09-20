import type { chapterStatus, runStatus } from '@/db/schema'

/** Display labels of the domain states (§13). */
export const statuses = Object.freeze({
  run: Object.freeze({
    created: 'založen',
    active: 'aktivní',
    archived: 'archivován',
  } satisfies Record<(typeof runStatus.enumValues)[number], string>),
  chapter: Object.freeze({
    in_progress: 'rozpracovaná',
    computed: 'spočítaná',
    released: 'vydaná',
  } satisfies Record<(typeof chapterStatus.enumValues)[number], string>),

})
