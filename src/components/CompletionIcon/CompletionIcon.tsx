import Adjust from '@mui/icons-material/Adjust'
import CheckCircle from '@mui/icons-material/CheckCircle'
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked'
import type { CompletionStatus } from '@/computation'
import styles from './CompletionIcon.module.css'

const ICONS = Object.freeze({
  empty: RadioButtonUnchecked,
  in_progress: Adjust,
  done: CheckCircle,
} satisfies Record<CompletionStatus, typeof Adjust>)

interface CompletionIconProps {
  status: CompletionStatus
  /** What the shape stands for here — a character's questionnaire, one question. */
  label: string
  testId: string
}

/** Shape as well as colour: the state must read in greyscale and for a colour-blind org (§6.4). */
export const CompletionIcon = ({ status, label, testId }: CompletionIconProps) => {
  const Icon = ICONS[status]

  return (
    <Icon
      fontSize="small"
      className={styles.icon}
      titleAccess={label}
      data-status={status}
      data-testid={testId}
    />
  )
}
