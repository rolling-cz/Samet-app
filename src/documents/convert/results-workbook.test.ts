import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { runFixture } from '@/testing/fixture-run'
import { outputOverview } from './output-overview'
import { RESULTS_SHEETS, resultsWorkbook } from './results-workbook'

const fixture = runFixture()
const overview = outputOverview(fixture.config, fixture.chapter1.state, 2)

const read = () => XLSX.read(resultsWorkbook(overview), { type: 'buffer' })
const rows = (sheet: string) => XLSX.utils.sheet_to_json<Record<string, unknown>>(read().Sheets[sheet] ?? {})

describe('resultsWorkbook', () => {
  it('má tři listy', () => {
    expect(read().SheetNames).toEqual([RESULTS_SHEETS.scales, RESULTS_SHEETS.resources, RESULTS_SHEETS.variants])
  })

  it('řádek na každou škálu každé postavy, i s rozsahem', () => {
    const scales = rows(RESULTS_SHEETS.scales)
    const marieRegime = scales.find((row) => row.Postava === 'Marie' && row.Škála === 'Regime')

    expect(scales).toHaveLength(overview.characters.reduce((sum, entry) => sum + entry.scales.length, 0))
    expect(marieRegime).toMatchObject({ Jméno: 'Marie Balážová', Hodnota: fixture.chapter1.state.characters.Marie?.scales.Regime })
  })

  it('společný účet je rozlišený od osobního a jmenuje partnera', () => {
    const accounts = rows(RESULTS_SHEETS.resources)
      .filter((row) => row.Postava === 'Marie' && row.Zdroj === 'Wealth')
      .map((row) => row.Účet)

    expect(accounts).toEqual(['osobní', 'společný MarieMirek (s postavou Mirek Pokorný)'])
  })

  it('varianty postav i skupin', () => {
    const variants = rows(RESULTS_SHEETS.variants)

    expect(variants.some((row) => row.Vlastník === 'skupina')).toBe(true)
    expect(variants.find((row) => row.Blok === 'B_Marie_1_Historie_1')?.Varianta).toMatch(/^V_Marie_1_Historie_1_/)
  })
})
