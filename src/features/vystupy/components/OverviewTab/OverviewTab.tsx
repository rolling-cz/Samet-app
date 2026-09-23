import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import type { OverviewEntry } from '@/documents'
import { chapterRoute } from '@/core'
import { vystupy } from '@/locales/cs/vystupy'
import type { OutputsView } from '../../types/outputs-view'
import styles from './OverviewTab.module.css'

interface OverviewTabProps {
  view: OutputsView
}

interface EntryProps {
  runId: string
  chapter: number
  entry: OverviewEntry
}

const Variants = ({ entry }: Pick<EntryProps, 'entry'>) =>
  entry.variants.length === 0 ? (
    <span className={styles.muted}>{vystupy.noVariants}</span>
  ) : (
    <ul className={styles.list}>
      {entry.variants.map((variant) => (
        <li key={variant.blockId} data-undecided={variant.variationId === undefined}>
          {variant.variationId ?? `${variant.blockId}: ${vystupy.undecided}`}
        </li>
      ))}
    </ul>
  )

/** Personal accounts, then the joint one with a link to the partner (§4.4) — never an unexplained sum. */
const Resources = ({ runId, chapter, entry }: EntryProps) => {
  const { household } = entry
  if (entry.resources.length === 0 && !household) return <span className={styles.muted}>{vystupy.none}</span>

  return (
    <ul className={styles.list}>
      {entry.resources.map((resource) => (
        <li key={resource.key}>
          {vystupy.resourceValue(resource.label, resource.value)}
          {household && <span className={styles.muted}> · {vystupy.personalAccount}</span>}
        </li>
      ))}
      {household?.resources.map((resource) => (
        <li key={`joint-${resource.key}`}>
          {vystupy.resourceValue(resource.label, resource.value)}
          <span className={styles.muted}>
            {' · '}
            {vystupy.jointAccount}{' '}
            {household.partnerIds.map((partnerId, index) => (
              <Link key={partnerId} href={chapterRoute(runId, chapter, 'postavy', partnerId)}>
                {index > 0 ? ', ' : ''}
                {household.partnerLabels[index]}
              </Link>
            ))}
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Every character on one screen (§6.4): the values their documents were filled
 * with and the variants chosen. A plain `Table` — the grid is allowed here, not required.
 */
export const OverviewTab = ({ view }: OverviewTabProps) => {
  const { runId, chapter, overview } = view

  return (
    <div className={styles.tab} data-testid="outputs--overview">
      <Typography variant="subtitle2" component="h2">
        {vystupy.characters}
      </Typography>
      <Table className={styles.table}>
        <TableHead>
          <TableRow>
            <TableCell>{vystupy.columns.owner}</TableCell>
            <TableCell>{vystupy.columns.scales}</TableCell>
            <TableCell>{vystupy.columns.resources}</TableCell>
            <TableCell>{vystupy.columns.variants}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {overview.characters.map((entry) => (
            <TableRow key={entry.owner.id} data-testid={`outputs--overview-${entry.owner.id}`}>
              <TableCell className={styles.owner}>
                <Link href={chapterRoute(runId, chapter, 'postavy', entry.owner.id)}>{entry.ownerLabel}</Link>
              </TableCell>
              <TableCell>
                {entry.scales.length === 0 ? (
                  <span className={styles.muted}>{vystupy.none}</span>
                ) : (
                  <ul className={styles.list}>
                    {entry.scales.map((scale) => (
                      <li key={scale.key}>{vystupy.scaleValue(scale.label, scale.value, scale.min, scale.max)}</li>
                    ))}
                  </ul>
                )}
              </TableCell>
              <TableCell>
                <Resources runId={runId} chapter={chapter} entry={entry} />
              </TableCell>
              <TableCell>
                <Variants entry={entry} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {overview.groups.length > 0 && (
        <>
          <Typography variant="subtitle2" component="h2">
            {vystupy.groups}
          </Typography>
          <Table className={styles.table}>
            <TableHead>
              <TableRow>
                <TableCell>{vystupy.columns.group}</TableCell>
                <TableCell>{vystupy.columns.variants}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {overview.groups.map((entry) => (
                <TableRow key={entry.owner.id} data-testid={`outputs--overview-${entry.owner.id}`}>
                  <TableCell className={styles.owner}>{entry.ownerLabel}</TableCell>
                  <TableCell>
                    <Variants entry={entry} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  )
}
