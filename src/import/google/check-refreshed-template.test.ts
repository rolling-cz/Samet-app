import { describe, expect, it } from 'vitest'
import { importWorkbook } from '../import-config'
import { toParsedTemplate } from '../template'
import { buildWorkbook, defaultTemplates } from '../testing/build-workbook'
import { refreshedTemplateErrors } from './check-refreshed-template'

const config = importWorkbook(buildWorkbook()).config
const inUse = defaultTemplates().map(toParsedTemplate)
const candidate = (markdown: string) => toParsedTemplate({ filename: 'Marie_2.md', markdown, fromGoogle: true })

describe('refreshedTemplateErrors', () => {
  it('opravená karta projde', () => {
    expect(refreshedTemplateErrors(config, inUse, candidate('# Nová Marie\n\n{BLOK B\\_Marie\\_2\\_X}'))).toEqual([])
  })

  it('karta, která přidá chybu, neprojde', () => {
    const errors = refreshedTemplateErrors(config, inUse, candidate('# Marie\n{BLOK B_Marie_2_X}\n{BLOK B_Neexistuje}'))

    expect(errors.some((message) => message.includes('B_Neexistuje'))).toBe(true)
  })

  it('karta, ze které zmizí značka bloku, neprojde — blok by se nikde nevytiskl', () => {
    expect(refreshedTemplateErrors(config, inUse, candidate('# Marie bez bloku')).length).toBeGreaterThan(0)
  })

  it('chyby, které tu byly už předtím v cizí šabloně, opravu jedné nezablokují', () => {
    const brokenMirek = toParsedTemplate({ filename: 'Mirek_2.md', markdown: '# Mirek {VEK}' })
    const withBroken = [...inUse.filter((t) => t.filename !== 'Mirek_2.md'), brokenMirek]

    expect(refreshedTemplateErrors(config, withBroken, candidate('# Nová Marie\n{BLOK B_Marie_2_X}'))).toEqual([])
  })
})
