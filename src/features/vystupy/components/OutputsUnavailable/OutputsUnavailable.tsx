'use client'

import Button from '@mui/material/Button'
import Link from 'next/link'
import { PageNote } from '@/components'
import { adminRoute, chapterRoute } from '@/core'
import { navigation } from '@/locales/cs/navigation'
import { vystupy } from '@/locales/cs/vystupy'

/** Where the fix is: the config in Správa, a computation to confirm, or nowhere. */
export type OutputsFix = { _type: 'config' } | { _type: 'recompute'; chapter: number } | { _type: 'none' }

interface OutputsUnavailableProps {
  runId: string
  title?: string
  /** Already in the org's words (`unavailableText`). */
  reason: string
  fix: OutputsFix
}

export const OutputsUnavailable = ({ runId, title = vystupy.unavailableTitle, reason, fix }: OutputsUnavailableProps) => (
  <PageNote
    title={title}
    body={reason}
    testId="outputs--unavailable"
    action={
      fix._type === 'config' ? (
        <Button component={Link} href={adminRoute(runId)} variant="outlined">
          {navigation.sections.sprava}
        </Button>
      ) : fix._type === 'recompute' ? (
        <Button component={Link} href={chapterRoute(runId, fix.chapter, 'prepocet')} variant="outlined">
          {vystupy.blockedAction(fix.chapter)}
        </Button>
      ) : undefined
    }
  />
)
