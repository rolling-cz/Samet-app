import { useCallback, type ChangeEvent } from 'react'
import { BOOL_RADIO_VALUES, INPUT_KEY_DATA, OPTION_ID_DATA } from '../constants/field-attributes'
import type { AnswerDraft } from '../types/answer-draft'
import type { SaveTiming } from './useQuestionAutosave'

type InputChange = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
type Update = (patch: (current: AnswerDraft) => AnswerDraft, timing: SaveTiming) => void

/** A choice saves on the click; a typed value waits for a pause or for leaving the field (§6.4). */
export const useDraftHandlers = (update: Update) => {
  const handleBool = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const boolValue = event.target.value === BOOL_RADIO_VALUES.yes
      update((current) => ({ ...current, boolValue }), 'now')
    },
    [update],
  )

  const handleSingle = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const optionId = event.target.value
      update((current) => ({ ...current, selectedOptionIds: [optionId] }), 'now')
    },
    [update],
  )

  const handleMulti = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const { value: optionId, checked } = event.target
      update(
        (current) => ({
          ...current,
          selectedOptionIds: checked
            ? [...current.selectedOptionIds.filter((id) => id !== optionId), optionId]
            : current.selectedOptionIds.filter((id) => id !== optionId),
        }),
        'now',
      )
    },
    [update],
  )

  const handleNumber = useCallback(
    (event: InputChange) => {
      const numberText = event.target.value
      update((current) => ({ ...current, numberText }), 'debounced')
    },
    [update],
  )

  const handleOtherText = useCallback(
    (event: InputChange) => {
      const otherText = event.target.value
      update((current) => ({ ...current, otherText }), 'debounced')
    },
    [update],
  )

  const handleInput = useCallback(
    (event: InputChange) => {
      const { value, dataset } = event.target
      const optionId = dataset[OPTION_ID_DATA.datasetKey]
      const inputKey = dataset[INPUT_KEY_DATA.datasetKey]
      if (optionId === undefined || inputKey === undefined) return

      update(
        (current) => ({
          ...current,
          inputTexts: { ...current.inputTexts, [optionId]: { ...current.inputTexts[optionId], [inputKey]: value } },
        }),
        'debounced',
      )
    },
    [update],
  )

  return { handleBool, handleSingle, handleMulti, handleNumber, handleOtherText, handleInput }
}
