import { describe, expect, it } from 'vitest'
import { errorMessage } from './error-message'

/** A `postgres.js` error: an `Error` with the server's diagnostic fields on it. */
const postgresError = (message: string, fields: Record<string, string>): Error =>
  Object.assign(new Error(message), fields)

describe('errorMessage', () => {
  it('reads a plain error', () => {
    expect(errorMessage(new Error('Něco se nepovedlo.'))).toBe('Něco se nepovedlo.')
  })

  it('reads a thrown non-error', () => {
    expect(errorMessage('spadlo to')).toBe('spadlo to')
    expect(errorMessage(undefined)).toBe('undefined')
  })

  it('appends the reason the database gave to Drizzle’s wrapper', () => {
    const wrapper = new Error('Failed query: insert into "characters" ...', {
      cause: postgresError('column "default_household_id" of relation "characters" does not exist', {
        code: '42703',
        column_name: 'default_household_id',
      }),
    })

    expect(errorMessage(wrapper)).toBe(
      'Failed query: insert into "characters" ... — ' +
        'column "default_household_id" of relation "characters" does not exist (column_name: default_household_id)',
    )
  })

  it('keeps detail, hint and the constraint name', () => {
    const error = postgresError('duplicate key value violates unique constraint', {
      detail: 'Key (run_id, external_id)=(2026-09-20_A, Marie) already exists.',
      hint: 'Zkontroluj list Characters.',
      table_name: 'characters',
      constraint_name: 'characters_run_external_key',
    })

    expect(errorMessage(error)).toBe(
      'duplicate key value violates unique constraint (' +
        'detail: Key (run_id, external_id)=(2026-09-20_A, Marie) already exists.; ' +
        'hint: Zkontroluj list Characters.; ' +
        'table_name: characters; ' +
        'constraint_name: characters_run_external_key)',
    )
  })

  it('says a repeated message only once', () => {
    const repeated = new Error('Stejná hláška', { cause: new Error('Stejná hláška') })

    expect(errorMessage(repeated)).toBe('Stejná hláška')
  })

  it('does not follow a cause cycle for ever', () => {
    const first = new Error('první')
    const second = new Error('druhý', { cause: first })
    first.cause = second

    expect(errorMessage(first)).toBe('první — druhý')
  })
})
