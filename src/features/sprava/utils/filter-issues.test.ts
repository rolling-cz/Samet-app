import { describe, expect, it } from 'vitest'
import type { Issue } from '@/import'
import { ISSUE_FILTER_ALL } from '../constants/issue-filter'
import { filterIssues, issueFacets } from './filter-issues'

const issue = (overrides: Partial<Issue>): Issue => ({
  severity: 'error',
  code: 'unknown_scale',
  location: { sheet: '2_Questions', row: 34, column: 'Scale and Resources Impact', cell: 'I34' },
  message: 'Škála neexistuje.',
  ...overrides,
})

const ISSUES: Issue[] = [
  issue({ value: 'S_Marie_Regme', suggestion: 'S_Marie_Regime' }),
  issue({ code: 'invalid_expression', location: { sheet: '2_Content', row: 5 }, message: 'Chybí závorka.' }),
  issue({ location: { sheet: '1_Questions', row: 3 } }),
]

const ALL = { query: '', sheet: ISSUE_FILTER_ALL, code: ISSUE_FILTER_ALL }

describe('filterIssues', () => {
  it('keeps everything without a filter', () => {
    expect(filterIssues(ISSUES, ALL)).toHaveLength(3)
  })

  it('finds an issue by the offending value, case-insensitively', () => {
    expect(filterIssues(ISSUES, { ...ALL, query: 'regme' })).toEqual([ISSUES[0]])
  })

  it('finds an issue by cell reference', () => {
    expect(filterIssues(ISSUES, { ...ALL, query: 'i34' })).toEqual([ISSUES[0]])
  })

  it('combines sheet and kind', () => {
    expect(filterIssues(ISSUES, { ...ALL, sheet: '2_Questions', code: 'unknown_scale' })).toEqual([ISSUES[0]])
  })
})

describe('issueFacets', () => {
  it('orders kinds by frequency', () => {
    expect(issueFacets(ISSUES).codes).toEqual([
      { value: 'unknown_scale', count: 2 },
      { value: 'invalid_expression', count: 1 },
    ])
  })
})
