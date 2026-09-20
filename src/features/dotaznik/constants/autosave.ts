/**
 * How long a number or text field waits after the last keystroke before it
 * saves. Long enough not to store every digit of `120`, short enough that the
 * org sees „uloženo" before reaching for the next paper. Leaving the field saves at once.
 */
export const AUTOSAVE_DELAY_MS = 800
