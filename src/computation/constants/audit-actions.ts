/** `audit_log.action` values written by the computation core. */
export const COMPUTATION_AUDIT_ACTIONS = Object.freeze({
  run: 'computation.run',
  confirm: 'computation.confirm',
  clamp: 'scale.clamp',
  roll: 'roll.create',
} as const)
