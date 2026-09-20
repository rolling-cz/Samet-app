import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import { memo, type ChangeEvent } from 'react'
import type { QuestionView } from '@/computation'
import { dotaznik } from '@/locales/cs/dotaznik'
import { BOOL_RADIO_VALUES } from '../../../../../../constants/field-attributes'
import { boolOptions } from '../../../../../../utils/bool-options'
import { optionLabel } from '../../../../../../utils/option-label'
import styles from './ChoiceControl.module.css'

interface ChoiceControlProps {
  question: QuestionView
  boolValue: boolean | null
  selectedOptionIds: readonly string[]
  onBool: (event: ChangeEvent<HTMLInputElement>) => void
  onSingle: (event: ChangeEvent<HTMLInputElement>) => void
  onMulti: (event: ChangeEvent<HTMLInputElement>) => void
}

/** A radio group with nothing selected has no value, so `null` is what keeps it controlled and empty. */
const NOTHING_SELECTED = null

/**
 * Never a preselected value (§6.3). `bool` is two radios, not a checkbox: an
 * unticked box could not be told from a question nobody answered.
 */
export const ChoiceControl = memo(function ChoiceControl({
  question,
  boolValue,
  selectedOptionIds,
  onBool,
  onSingle,
  onMulti,
}: ChoiceControlProps) {
  if (question.type === 'bool') {
    const { yes, no } = boolOptions(question)

    return (
      <RadioGroup
        row
        name={question.id}
        aria-labelledby={`${question.id}--text`}
        value={boolValue === null ? NOTHING_SELECTED : String(boolValue)}
        onChange={onBool}
        className={styles.options}
      >
        <FormControlLabel
          value={BOOL_RADIO_VALUES.yes}
          control={<Radio size="small" />}
          label={dotaznik.yes}
          data-testid={`option--${yes?.id ?? `${question.id}--yes`}`}
        />
        <FormControlLabel
          value={BOOL_RADIO_VALUES.no}
          control={<Radio size="small" />}
          label={dotaznik.no}
          data-testid={`option--${no?.id ?? `${question.id}--no`}`}
        />
      </RadioGroup>
    )
  }

  if (question.type === 'multi') {
    return (
      <FormGroup row aria-labelledby={`${question.id}--text`} className={styles.options}>
        {question.options.map((option) => (
          <FormControlLabel
            key={option.id}
            control={
              <Checkbox
                size="small"
                value={option.id}
                checked={selectedOptionIds.includes(option.id)}
                onChange={onMulti}
              />
            }
            label={optionLabel(option)}
            data-testid={`option--${option.id}`}
          />
        ))}
      </FormGroup>
    )
  }

  return (
    <RadioGroup
      row
      name={question.id}
      aria-labelledby={`${question.id}--text`}
      value={selectedOptionIds[0] ?? NOTHING_SELECTED}
      onChange={onSingle}
      className={styles.options}
    >
      {question.options.map((option) => (
        <FormControlLabel
          key={option.id}
          value={option.id}
          control={<Radio size="small" />}
          label={optionLabel(option)}
          data-testid={`option--${option.id}`}
        />
      ))}
    </RadioGroup>
  )
})
