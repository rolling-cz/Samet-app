import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import { memo, useEffect, useRef } from 'react'
import { CompletionIcon } from '@/components'
import type { AnswerState, CompletionStatus, QuestionView } from '@/computation'
import { dotaznik } from '@/locales/cs/dotaznik'
import { DIRECT_TYPES } from '../../../../constants/question-kinds'
import { useDraftHandlers } from '../../../../hooks/useDraftHandlers'
import { useQuestionAutosave } from '../../../../hooks/useQuestionAutosave'
import type { InvalidField } from '../../../../types/answer-write'
import type { QuestionnaireContext } from '../../../../types/questionnaire-context'
import { chosenOptions } from '../../../../utils/chosen-options'
import { draftAnswerState } from '../../../../utils/draft-answer-state'
import { toAnswerWrite } from '../../../../utils/to-answer-write'
import { ChoiceControl } from './components/ChoiceControl/ChoiceControl'
import { NumberControl } from './components/NumberControl/NumberControl'
import { OptionExtras } from './components/OptionExtras/OptionExtras'
import { SaveStatusLine } from './components/SaveStatusLine/SaveStatusLine'
import styles from './QuestionCard.module.css'

interface QuestionCardProps {
  question: QuestionView
  context: QuestionnaireContext
  /** The first unanswered question takes the focus when the character opens (§6.4). */
  hasInitialFocus: boolean
}

/** One question's state in the shapes of the panel, so the org reads one visual language. */
const STATE_ICONS = Object.freeze({
  unanswered: 'empty',
  incomplete: 'in_progress',
  complete: 'done',
} satisfies Record<AnswerState, CompletionStatus>)

const NO_INVALID_FIELDS: readonly InvalidField[] = Object.freeze([])

/**
 * One question, saved on its own. Player and org questions are the same card in
 * the same stream — the org ones only carry a quiet badge (§6.7).
 */
export const QuestionCard = memo(function QuestionCard({ question, context, hasInitialFocus }: QuestionCardProps) {
  const cardRef = useRef<HTMLElement>(null)
  const { draft, saved, status, failure, update, flush, retry, cancel } = useQuestionAutosave(question, context)
  const { handleBool, handleSingle, handleMulti, handleNumber, handleOtherText, handleInput } = useDraftHandlers(update)

  const state = draftAnswerState(question, draft)
  const outcome = toAnswerWrite(question, draft)
  const invalidFields = outcome._type === 'invalid' ? outcome.fields : NO_INVALID_FIELDS
  const isDirect = DIRECT_TYPES.includes(question.type)

  useEffect(() => {
    if (hasInitialFocus) cardRef.current?.querySelector('input')?.focus()
  }, [hasInitialFocus])

  return (
    <article
      ref={cardRef}
      className={styles.card}
      data-state={state}
      data-source={question.source}
      data-testid={`question--${question.id}`}
    >
      <header className={styles.head}>
        <CompletionIcon
          status={STATE_ICONS[state]}
          label={dotaznik.answerState[state]}
          testId={`question-state--${question.id}`}
        />
        <Typography variant="body1" component="h2" id={`${question.id}--text`} className={styles.text}>
          <span className={styles.ordinal}>{dotaznik.questionNumber(question.ordinal)}</span> {question.text}
        </Typography>
        {question.pollId !== undefined && <Chip variant="outlined" label={dotaznik.pollBadge} />}
        {question.source === 'org' && <Chip variant="outlined" label={dotaznik.orgBadge} />}
      </header>

      {question.helpText && (
        <Typography variant="caption" component="p" className={styles.help}>
          {question.helpText}
        </Typography>
      )}

      <div className={styles.body}>
        {isDirect ? (
          <NumberControl
            questionId={question.id}
            target={question.target}
            numberText={draft.numberText}
            isInvalid={invalidFields.some((field) => field.optionId === undefined)}
            onChange={handleNumber}
            onBlur={flush}
          />
        ) : (
          <ChoiceControl
            question={question}
            boolValue={draft.boolValue}
            selectedOptionIds={draft.selectedOptionIds}
            onBool={handleBool}
            onSingle={handleSingle}
            onMulti={handleMulti}
          />
        )}

        {chosenOptions(question, draft).map(
          (option) =>
            (option.isOther || option.inputs.length > 0) && (
              <OptionExtras
                key={option.id}
                option={option}
                otherText={draft.otherText}
                inputTexts={draft.inputTexts[option.id]}
                invalidFields={invalidFields}
                onOtherText={handleOtherText}
                onInput={handleInput}
                onBlur={flush}
              />
            ),
        )}
      </div>

      <SaveStatusLine
        questionId={question.id}
        status={status}
        saved={saved}
        failure={failure}
        onRetry={retry}
        onCancel={cancel}
      />
    </article>
  )
})
