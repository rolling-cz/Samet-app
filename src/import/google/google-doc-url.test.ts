import { describe, expect, it } from 'vitest'
import { googleDocEditUrl, googleDocExportUrl, parseGoogleDocUrl } from './google-doc-url'

const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcd'

describe('parseGoogleDocUrl', () => {
  it.each([
    [`https://docs.google.com/document/d/${ID}/edit?tab=t.0`, { documentId: ID, tabId: 't.0' }],
    [`https://docs.google.com/document/d/${ID}/edit?tab=t.k3j9x2`, { documentId: ID, tabId: 't.k3j9x2' }],
    [`https://docs.google.com/document/d/${ID}/edit?usp=sharing&tab=t.0`, { documentId: ID, tabId: 't.0' }],
    [`https://docs.google.com/document/u/0/d/${ID}/edit?tab=t.0#heading=h.abc`, { documentId: ID, tabId: 't.0' }],
    [`docs.google.com/document/d/${ID}/edit?tab=t.0`, { documentId: ID, tabId: 't.0' }],
    [`<https://docs.google.com/document/d/${ID}/edit?tab=t.0>`, { documentId: ID, tabId: 't.0' }],
    [`  https://docs.google.com/document/d/${ID}/edit?tab=t.0  `, { documentId: ID, tabId: 't.0' }],
  ])('%s', (url, ref) => {
    expect(parseGoogleDocUrl(url)).toEqual({ _type: 'ok', ref })
  })

  it('odkaz bez karty projde, jen bez tabId', () => {
    expect(parseGoogleDocUrl(`https://docs.google.com/document/d/${ID}/edit?usp=sharing`)).toEqual({
      _type: 'ok',
      ref: { documentId: ID },
    })
  })

  it('holé ID', () => {
    expect(parseGoogleDocUrl(ID)).toEqual({ _type: 'ok', ref: { documentId: ID } })
  })

  it('publikovaný dokument vrací HTML, ne markdown', () => {
    expect(parseGoogleDocUrl(`https://docs.google.com/document/d/e/2PACX-${ID}/pub`)).toEqual({
      _type: 'error',
      reason: 'published',
    })
  })

  it.each([
    `https://docs.google.com/spreadsheets/d/${ID}/edit#gid=0`,
    `https://docs.google.com/presentation/d/${ID}/edit`,
    `https://drive.google.com/file/d/${ID}/view`,
  ])('jiný typ souboru: %s', (url) => {
    expect(parseGoogleDocUrl(url)).toEqual({ _type: 'error', reason: 'not_a_document' })
  })

  it.each([
    '',
    'Marie kapitola 2',
    `https://evil.example.com/document/d/${ID}/edit`,
    `https://docs.google.com.evil.example/document/d/${ID}/edit`,
    'https://docs.google.com/document/d/kratke/edit',
    `https://docs.google.com/document/d/${ID}/edit?tab=../../x`,
  ])('neplatné: %s', (url) => {
    expect(parseGoogleDocUrl(url)).toEqual({ _type: 'error', reason: 'invalid' })
  })
})

describe('googleDocExportUrl', () => {
  it('skládá URL jen z ID a karty', () => {
    expect(googleDocExportUrl({ documentId: ID, tabId: 't.0' })).toBe(
      `https://docs.google.com/document/d/${ID}/export?format=md&tab=t.0`,
    )
    expect(googleDocExportUrl({ documentId: ID })).toBe(`https://docs.google.com/document/d/${ID}/export?format=md`)
  })

  it('odkaz k otevření nese kartu', () => {
    expect(googleDocEditUrl({ documentId: ID, tabId: 't.0' })).toBe(`https://docs.google.com/document/d/${ID}/edit?tab=t.0`)
  })
})
