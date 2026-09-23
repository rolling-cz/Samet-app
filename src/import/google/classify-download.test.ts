import { describe, expect, it } from 'vitest'
import { classifyDownload, exportRedirectTarget, titleFromDisposition, type DownloadResponse } from './classify-download'

const bytes = (text: string) => new TextEncoder().encode(text)
const response = (overrides: Partial<DownloadResponse> = {}): DownloadResponse => ({
  status: 200,
  contentType: 'text/markdown; charset=utf-8',
  body: bytes('# Marie\n\n{BLOK B_Marie_1_Historie_1}\n'),
  ...overrides,
})

describe('classifyDownload', () => {
  it('markdown projde i s diakritikou a titulkem', () => {
    const outcome = classifyDownload(
      response({
        body: bytes('# Žluťoučký kůň'),
        contentDisposition: `attachment; filename="Marie.md"; filename*=UTF-8''Marie%20Bal%C3%A1%C5%BEov%C3%A1%20%E2%80%93%20kap.%202.md`,
      }),
    )

    expect(outcome).toEqual({ _type: 'ok', markdown: '# Žluťoučký kůň', title: 'Marie Balážová – kap. 2' })
  })

  it('BOM na začátku se zahodí', () => {
    expect(classifyDownload(response({ body: bytes('﻿# A') }))).toMatchObject({ markdown: '# A' })
  })

  it('redirect na přihlášení = dokument není sdílený', () => {
    expect(
      classifyDownload(response({ status: 302, location: 'https://accounts.google.com/ServiceLogin?continue=…' })),
    ).toEqual({ _type: 'not_public' })
  })

  it('redirect jinam se nesleduje', () => {
    expect(classifyDownload(response({ status: 302, location: 'https://example.com/' }))).toEqual({
      _type: 'failed',
      status: 302,
    })
  })

  it('HTML tělo je přihlašovací stránka, i když content-type lže', () => {
    expect(classifyDownload(response({ body: bytes('<!DOCTYPE html><html>…') }))).toEqual({ _type: 'not_public' })
    expect(classifyDownload(response({ contentType: 'text/html', body: bytes('ahoj') }))).toEqual({ _type: 'not_public' })
  })

  it.each([
    [401, 'not_public'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [429, 'rate_limited'],
    [500, 'failed'],
  ])('status %i → %s', (status, type) => {
    expect(classifyDownload(response({ status }))._type).toBe(type)
  })

  it('binární obsah není markdown', () => {
    expect(classifyDownload(response({ contentType: 'application/pdf' }))).toEqual({
      _type: 'not_markdown',
      contentType: 'application/pdf',
    })
  })

  it('prázdný dokument', () => {
    expect(classifyDownload(response({ body: bytes('  \n\n') }))).toEqual({ _type: 'empty' })
  })
})

describe('exportRedirectTarget', () => {
  // As the real export of a shared document answers (verified 23. 9. 2026).
  const content = 'https://doc-0g-60-docstext.googleusercontent.com/export/s8v029/m3racr/1790159905000/1089669/*/1SWg?format=md'

  it('sleduje skok exportu na googleusercontent.com', () => {
    expect(exportRedirectTarget({ status: 307, location: content })).toBe(content)
  })

  it.each([
    ['přihlášení', 'https://accounts.google.com/ServiceLogin?continue=x'],
    ['cizí doména', 'https://evil.example.com/export'],
    ['podvržená doména', 'https://doc.googleusercontent.com.evil.example/x'],
    ['http', content.replace('https:', 'http:')],
    ['relativní', '/export/x'],
  ])('jinam nevede: %s', (_label, location) => {
    expect(exportRedirectTarget({ status: 307, location })).toBeUndefined()
  })

  it('bez přesměrování nic', () => {
    expect(exportRedirectTarget({ status: 200, location: content })).toBeUndefined()
  })

  it('text/x-markdown z googleusercontent projde', () => {
    expect(classifyDownload(response({ contentType: 'text/x-markdown; charset=utf-8' }))._type).toBe('ok')
  })
})

describe('titleFromDisposition', () => {
  it('bez hlavičky nic', () => {
    expect(titleFromDisposition(undefined)).toBeUndefined()
  })

  it('jen prosté filename', () => {
    expect(titleFromDisposition('attachment; filename="Mirek kap 2.md"')).toBe('Mirek kap 2')
  })
})
