import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import { RunBadge } from '@/components'
import { runHomeRoute } from '@/core'
import type { RunSummary } from '@/db'
import { APP_LOCALE } from '@/locales/app-locale'
import { common } from '@/locales/cs/common'
import { runsText } from '@/locales/cs/runs'
import { statuses } from '@/locales/cs/statuses'
import { RenameRunButton } from './components/RenameRunButton/RenameRunButton'
import styles from './RunList.module.css'

// `YYYY-MM-DD` parses as UTC midnight; formatting in UTC keeps the day from shifting.
const startDateFormat = new Intl.DateTimeFormat(APP_LOCALE, { timeZone: 'UTC' })

export const RunList = ({ runs }: { runs: RunSummary[] }) => (
  <section data-testid="run-list">
    <Typography variant="h5" component="h1">
      {runsText.title}
    </Typography>
    <Typography variant="body2" className={styles.hint}>
      {runs.length === 0 ? runsText.empty : runsText.intro}
    </Typography>

    {runs.length > 0 && (
      <Paper variant="outlined" className={styles.tableWrap}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{runsText.columnId}</TableCell>
              <TableCell>{runsText.columnLabel}</TableCell>
              <TableCell>{runsText.columnStartDate}</TableCell>
              <TableCell>{runsText.columnStatus}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {runs.map((run) => (
              <TableRow key={run.id} data-status={run.status} className={styles.row} data-testid={`run-list--${run.id}`}>
                <TableCell>
                  <RunBadge runId={run.id} letter={run.letter} />
                </TableCell>
                <TableCell>{run.label ?? common.emptyValue}</TableCell>
                <TableCell>{startDateFormat.format(new Date(run.startDate))}</TableCell>
                <TableCell>{statuses.run[run.status]}</TableCell>
                <TableCell align="right" className={styles.actions}>
                  <RenameRunButton runId={run.id} label={run.label} />
                  <Button
                    component={Link}
                    href={runHomeRoute(run.id)}
                    variant="outlined"
                    data-testid={`run-list--open--${run.id}`}
                  >
                    {runsText.open}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    )}
  </section>
)
