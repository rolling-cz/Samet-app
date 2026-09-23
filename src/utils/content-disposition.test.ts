import { describe, expect, it } from 'vitest'
import { attachmentDisposition } from './content-disposition'

describe('attachmentDisposition', () => {
  it('keeps diacritics in filename* and strips them from the fallback', () => {
    expect(attachmentDisposition('2026-09-12_A_Věra.md')).toBe(
      `attachment; filename="2026-09-12_A_Vera.md"; filename*=UTF-8''2026-09-12_A_V%C4%9Bra.md`,
    )
  })

  it('cannot break out of the quoted fallback', () => {
    expect(attachmentDisposition('a"b.xlsx')).toContain('filename="a_b.xlsx"')
  })
})
