import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { memo, type ChangeEvent } from 'react'
import type { DirectTargetView, PersonView } from '@/computation'
import { common } from '@/locales/cs/common'
import { dotaznik } from '@/locales/cs/dotaznik'
import { parseWholeNumber } from '../../../../../../utils/parse-whole-number'
import styles from './NumberControl.module.css'

interface NumberControlProps {
  questionId: string
  target: DirectTargetView | undefined
  numberText: string
  isInvalid: boolean
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onBlur: () => void
}

const nameOf = (person: PersonView): string => common.fullName(person.firstName, person.lastName)

/** An absolute setting must never land somewhere the org did not mean, so the target is spelled out (§4.4). */
const targetLine = (target: DirectTargetView): string => {
  if (target._type === 'scale') {
    return `${dotaznik.scaleTarget(target.externalId, nameOf(target.owner))} — ${dotaznik.scaleRange(target.min, target.max, target.value)}`
  }

  const { account } = target
  if (account._type === 'household' && target.value === undefined) {
    return dotaznik.jointAccountMissing(target.label, account.householdId)
  }

  const line =
    account._type === 'personal'
      ? dotaznik.personalAccount(target.label, nameOf(account.owner))
      : dotaznik.jointAccount(target.label, account.members.map(nameOf).join(dotaznik.memberSeparator))

  return target.value === undefined ? line : `${line} — ${dotaznik.accountValue(target.value)}`
}

const rangeWarning = (target: DirectTargetView | undefined, numberText: string): string | undefined => {
  if (target?._type !== 'scale') return undefined

  const number = parseWholeNumber(numberText, true)
  if (number._type !== 'valid' || (number.value >= target.min && number.value <= target.max)) return undefined

  return dotaznik.scaleOutOfRange(target.min, target.max)
}

/** `scale_direct` / `resource_direct`: one whole number, never prefilled — not even with the current value. */
export const NumberControl = memo(function NumberControl({
  questionId,
  target,
  numberText,
  isInvalid,
  onChange,
  onBlur,
}: NumberControlProps) {
  const warning = rangeWarning(target, numberText)

  return (
    <div className={styles.control}>
      {target && (
        <Typography variant="body2" className={styles.target} data-testid={`direct-target--${questionId}`}>
          {targetLine(target)}
        </Typography>
      )}
      <TextField
        label={dotaznik.numberLabel}
        value={numberText}
        onChange={onChange}
        onBlur={onBlur}
        margin="none"
        error={isInvalid}
        helperText={isInvalid ? dotaznik.numberInvalid : warning}
        className={styles.field}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: { inputMode: 'numeric', 'data-testid': `number--${questionId}` },
        }}
      />
    </div>
  )
})
