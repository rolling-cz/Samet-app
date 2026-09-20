import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { memo, type ChangeEvent } from 'react'
import type { OptionView } from '@/computation'
import { dotaznik } from '@/locales/cs/dotaznik'
import { INPUT_KEY_DATA, OPTION_ID_DATA } from '../../../../../../constants/field-attributes'
import type { InvalidField } from '../../../../../../types/answer-write'
import { inputLabel } from '../../../../../../utils/input-label'
import { payoutProgress } from '../../../../../../utils/payout-progress'
import styles from './OptionExtras.module.css'

type FieldChange = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>

interface OptionExtrasProps {
  option: OptionView
  otherText: string
  inputTexts: Record<string, string> | undefined
  invalidFields: readonly InvalidField[]
  onOtherText: (event: FieldChange) => void
  onInput: (event: FieldChange) => void
  onBlur: () => void
}

/**
 * What a chosen option asks for on top of the choice: the `_OTHER_` text and
 * the `{input}` fields of its effect (§4.4). The fields start empty and stay
 * the org's — no remainder, no halves, no prefilled zero.
 */
export const OptionExtras = memo(function OptionExtras({
  option,
  otherText,
  inputTexts,
  invalidFields,
  onOtherText,
  onInput,
  onBlur,
}: OptionExtrasProps) {
  const progress = payoutProgress(option, inputTexts)
  const dissolvesMissingHousehold =
    option.householdEffect?.kind === 'household_dissolve' && option.householdEffect.jointBalance === undefined

  return (
    <div className={styles.extras} data-testid={`option-extras--${option.id}`}>
      {option.isOther && (
        <TextField
          label={dotaznik.otherLabel}
          value={otherText}
          onChange={onOtherText}
          onBlur={onBlur}
          margin="none"
          fullWidth
          helperText={otherText.trim() === '' ? dotaznik.otherEmptyWarning : undefined}
          slotProps={{ htmlInput: { 'data-testid': `other-text--${option.id}` } }}
        />
      )}

      {option.inputs.length > 0 && (
        <div className={styles.inputs}>
          {option.inputs.map((field) => {
            const isInvalid = invalidFields.some(
              (invalid) => invalid.optionId === option.id && invalid.inputKey === field.key,
            )

            return (
              <TextField
                key={field.key}
                label={inputLabel(field, option.householdEffect)}
                value={inputTexts?.[field.key] ?? ''}
                onChange={onInput}
                onBlur={onBlur}
                margin="none"
                error={isInvalid}
                helperText={isInvalid ? dotaznik.inputInvalid : undefined}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: {
                    inputMode: 'numeric',
                    [OPTION_ID_DATA.attribute]: option.id,
                    [INPUT_KEY_DATA.attribute]: field.key,
                    'data-testid': `input--${option.id}--${field.key}`,
                  },
                }}
              />
            )
          })}
        </div>
      )}

      {progress && (
        <Typography
          variant="body2"
          className={styles.progress}
          data-matches={progress.matches}
          data-testid={`payout-progress--${option.id}`}
        >
          {dotaznik.payoutProgress(progress.distributed, progress.balance)}
          {!progress.matches && ` — ${dotaznik.payoutMismatch}`}
        </Typography>
      )}
      {dissolvesMissingHousehold && (
        <Typography variant="body2" className={styles.progress} data-matches="false">
          {dotaznik.payoutNoHousehold}
        </Typography>
      )}
    </div>
  )
})
