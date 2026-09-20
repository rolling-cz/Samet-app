/** Admin screen (§6.4, §10.2); the screen itself lives in `features/sprava`. */
import Typography from '@mui/material/Typography'
import { loadAdminData, UploadArchive, UploadPanel } from '@/features/sprava'
import { sprava } from '@/locales/cs/sprava'
import styles from './page.module.css'

/**
 * Config import validates the whole workbook and writes it in one transaction,
 * on top of a possible cold start of a suspended database. The server action
 * posts to this route, so the segment limit covers it too.
 */
export const maxDuration = 60

interface SpravaPageProps {
  params: Promise<{ runId: string }>
}

const SpravaPage = async ({ params }: SpravaPageProps) => {
  const { runId } = await params
  const { uploads, isConfigFrozen } = await loadAdminData(runId)

  return (
    <div className={styles.page}>
      <Typography variant="h5" component="h1">
        {sprava.title}
      </Typography>
      <UploadPanel runId={runId} isConfigFrozen={isConfigFrozen} />
      <UploadArchive runId={runId} uploads={uploads} />
    </div>
  )
}

export default SpravaPage
