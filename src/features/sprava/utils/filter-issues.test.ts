import { describe, expect, it } from 'vitest'
import type { Issue } from '@/import'
import { ISSUE_FILTER_ALL } from '../constants/issue-filter'
import { filterIssues, issueFacets } from './filter-issues'

const issue = (overrides: Partial<Issue>): Issue => ({
  severity: 'chyba',
  code: 'neznama_skala',
  location: { sheet: '2_Questions', row: 34, column: 'Scale and Resources Impact', cell: 'I34' },
  message: 'Škála neexistuje.',
  ...overrides,
})

const ISSUES: Issue[] = [
  issue({ value: 'S_Marie_Regme', suggestion: 'S_Marie_Regime' }),
  issue({ code: 'vadny_vyraz', location: { sheet: '2_Content', row: 5 }, message: 'Chybí závorka.' }),
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
    expect(filterIssues(ISSUES, { ...ALL, sheet: '2_Questions', code: 'neznama_skala' })).toEqual([ISSUES[0]])
  })
})

describe('issueFacets', () => {
  it('orders kinds by frequency', () => {
    expect(issueFacets(ISSUES).codes).toEqual([
      { value: 'neznama_skala', count: 2 },
      { value: 'vadny_vyraz', count: 1 },
    ])
  })
})
