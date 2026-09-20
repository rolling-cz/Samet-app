'use client'

import Button from '@mui/material/Button'
import NativeSelect from '@mui/material/NativeSelect'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, type ChangeEvent } from 'react'
import { HOME_ROUTE, switchRunRoute } from '@/core'
import { useRunLocation } from '@/core/hooks/useRunLocation'
import type { RunSummary } from '@/db'
import { navigation } from '@/locales/cs/navigation'
import { statuses } from '@/locales/cs/statuses'
import styles from './RunSwitcher.module.css'

const SELECT_ID = 'run-switcher'

/** An empty value selects nothing — only shown before a run is chosen. */
const NO_RUN = ''

interface RunSwitcherProps {
  runs: RunSummary[]
  runId: string | undefined
}

/**
 * Switching keeps the section and the chapter, so the org stays on the same
 * screen of the other run — but drops the character: IDs need not match across runs.
 */
export const RunSwitcher = ({ runs, runId }: RunSwitcherProps) => {
  const router = useRouter()
  const location = useRunLocation()

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => router.push(switchRunRoute(location, event.target.value)),
    [router, location],
  )

  return (
    <div className={styles.switcher} data-testid="run-switcher">
      <label htmlFor={SELECT_ID} className={styles.label}>
        {navigation.runLabel}
      </label>
      <NativeSelect
        value={runId ?? NO_RUN}
        onChange={handleChange}
        className={styles.select}
        inputProps={{ id: SELECT_ID }}
        data-testid="run-switcher--select"
      >
        {!runId && (
          <option value={NO_RUN} disabled>
            {navigation.pickRun}
          </option>
        )}
        {runs.map((run) => (
          <option key={run.id} value={run.id}>
            {navigation.runOption(run.id, run.label, statuses.run[run.status])}
          </option>
        ))}
      </NativeSelect>
      {runId && (
        <Button component={Link} href={HOME_ROUTE} color="inherit" data-testid="run-switcher--all">
          {navigation.allRuns}
        </Button>
      )}
    </div>
  )
}
