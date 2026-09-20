/** `audit_log.action` values written by the computation core. */
export const COMPUTATION_AUDIT_ACTIONS = Object.freeze({
  run: 'computation.run',
  confirm: 'computation.confirm',
  clamp: 'scale.clamp',
  roll: 'roll.create',
} as const)

/**
 * `audit_log.action` values of the questionnaire. They live here because the
 * core reads them back: an answer changed after the last computation makes that
 * computation stale, and a cancelled answer leaves no row but its audit entry.
 */
export const ANSWER_AUDIT_ACTIONS = Object.freeze({
  change: 'answer.change',
  cancel: 'answer.cancel',
} as const)

/** `audit_log.entity_kind` of every answer entry. */
export const ANSWER_AUDIT_ENTITY = 'answer'
