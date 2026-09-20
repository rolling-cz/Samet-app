import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { TitledPanel } from '@/components'
import type { TemplateCoverage } from '@/import'
import { importReport } from '@/locales/cs/import_report'
import styles from './Coverage.module.css'

/** Which character or group still has no template, per chapter (§10.2). */
export const Coverage = ({ coverage }: { coverage: TemplateCoverage }) => (
  <TitledPanel
    title={importReport.templatesTitle}
    note={
      coverage.missingCount === 0
        ? importReport.allTemplatesPresent
        : importReport.missingTemplates(coverage.missingCount)
    }
    testId="template-coverage"
  >
    <Table size="small">
      <TableBody>
        {coverage.assignments.map((row) => (
          <TableRow
            key={`${row.ownerExternalId}-${row.chapter}`}
            data-testid={`template-coverage--${row.ownerExternalId}-${row.chapter}`}
          >
            <TableCell>{row.ownerName}</TableCell>
            <TableCell>
              <code className={styles.expected}>
                {`${row.ownerExternalId}_${row.chapter}.md`}
              </code>
            </TableCell>
            <TableCell className={styles.status} data-status={row.status}>
              {row.status === 'prirazena' ? row.filename : importReport.templateMissing}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    {coverage.unmatched.length > 0 && (
      <Typography variant="caption" component="p" className={styles.unmatched}>
        {importReport.unmatchedTemplates(coverage.unmatched.map((template) => template.filename))}
      </Typography>
    )}
  </TitledPanel>
)
