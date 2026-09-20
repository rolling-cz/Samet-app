/**
 * `data-*` attributes an `{input}` field carries, so one handler serves every
 * field of a question instead of a closure per field.
 */
export const OPTION_ID_DATA = Object.freeze({ attribute: 'data-option-id', datasetKey: 'optionId' } as const)
export const INPUT_KEY_DATA = Object.freeze({ attribute: 'data-input-key', datasetKey: 'inputKey' } as const)

/** Radio values of a `bool` question; a radio's value is always a string. */
export const BOOL_RADIO_VALUES = Object.freeze({ yes: 'true', no: 'false' } as const)
