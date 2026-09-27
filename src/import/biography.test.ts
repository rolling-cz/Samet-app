/** Biography entries in `N_Content` and the `{ZIVOTOPIS}` marker (§8.2, §8.4, §11 6j). */
import { describe, expect, it } from 'vitest'
import { BIOGRAPHY_TEXT_COLUMN, BIOGRAPHY_YEAR_COLUMN } from './constants/sheets'
import { importWorkbook } from './import-config'
import { buildWorkbook, defaultTemplates, type Row } from './testing/build-workbook'
import { toEngineConfig } from './to-engine-config'
import type { ImportResult } from './types/import-result'

const YEAR = BIOGRAPHY_YEAR_COLUMN
const TEXT = BIOGRAPHY_TEXT_COLUMN

/** Marie's block the default questions and template use, with the given rows after its first variant. */
const markedBlock = (first: Row = {}, rest: Row[] = []): Row[] => [
  {
    Character: 'Marie',
    'Block ID': 'B_Marie_2_X',
    'Variation ID': 'V_A',
    'Variation Text': 'Text A',
    Priority: '1',
    Conditions: 'A_Marie_2_1_Ano',
    ...first,
  },
  ...rest,
  { 'Variation ID': 'V_B', 'Variation Text': 'Text B', Priority: '2', Conditions: 'DEFAULT' },
]

/** `B_Marie_2_Vzdy` — an "always" entry: one fallback variant, no text, no marker. */
const alwaysBlock = (year = '1985', text = 'Vždy.'): Row => ({
  'Block ID': 'B_Marie_2_Vzdy',
  'Variation ID': 'V_Vzdy',
  [YEAR]: year,
  [TEXT]: text,
})

const MARIE_TEMPLATE = { filename: 'Marie_2.md', markdown: '# Marie\n{BLOK B_Marie_2_X}\n\n{ZIVOTOPIS}' }

const run = (content: Row[], templates = [MARIE_TEMPLATE, ...defaultTemplates().slice(1)]): ImportResult =>
  importWorkbook(buildWorkbook({ content }), templates)

const byCode = (result: ImportResult, code: string) => result.issues.filter((issue) => issue.code === code)

const firstVariation = (result: ImportResult) => result.config.blocks.get(2)?.[0]?.variations[0]

describe('biography entries (§8.2)', () => {
  it('reads an entry on the variant`s own row', () => {
    const result = run(markedBlock({ [YEAR]: '1985', [TEXT]: 'Stala se vedoucí.' }))
    expect(result.errors).toEqual([])
    expect(firstVariation(result)?.biography).toMatchObject([{ year: 1985, text: 'Stala se vedoucí.', row: 2 }])
  })

  it('adds a continuation row as a second entry of the variant above', () => {
    const result = run(
      markedBlock({ [YEAR]: '1985', [TEXT]: 'Zaučuje se.' }, [{ [YEAR]: '1986', [TEXT]: 'Je vedoucí.' }]),
    )
    expect(result.errors).toEqual([])
    expect(firstVariation(result)?.biography.map((entry) => entry.year)).toEqual([1985, 1986])
    // The row is an entry, not a variant of its own.
    expect(result.config.blocks.get(2)?.[0]?.variations.map((variation) => variation.externalId)).toEqual([
      'V_A',
      'V_B',
    ])
  })

  it('refuses a continuation row that carries anything but the entry', () => {
    const result = run(markedBlock({}, [{ [YEAR]: '1986', [TEXT]: 'Je vedoucí.', 'Variation Text': 'navíc' }]))
    const issue = result.errors.find((error) => error.location.row === 3)
    expect(issue?.message).toContain('`Variation Text`')
  })

  it('refuses a continuation row that starts a block', () => {
    const result = run([
      ...markedBlock(),
      { Character: 'Marie', 'Block ID': 'B_Marie_2_Y', [YEAR]: '1986', [TEXT]: 'Je vedoucí.' },
    ])
    expect(result.errors.some((error) => error.message.includes('nesmí blok začínat'))).toBe(true)
  })

  it('never attaches a continuation row past a broken variant', () => {
    const result = run(
      markedBlock({}, [
        { 'Variation ID': 'V_Vadna', 'Variation Text': 'x', Priority: 'nula', Conditions: 'DEFAULT' },
        { [YEAR]: '1986', [TEXT]: 'Je vedoucí.' },
      ]),
    )
    expect(result.errors.some((error) => error.message.includes('nemá nad sebou platnou variantu'))).toBe(true)
    expect(firstVariation(result)?.biography).toEqual([])
  })

  it('wants the year and the text together', () => {
    const noText = run(markedBlock({ [YEAR]: '1985' }))
    expect(noText.errors.find((error) => error.location.column === TEXT)?.code).toBe('missing_value')

    const noYear = run(markedBlock({ [TEXT]: 'Bez roku.' }))
    expect(noYear.errors.find((error) => error.location.column === YEAR)?.code).toBe('missing_value')
  })

  it('wants a whole number for the year', () => {
    const result = run(markedBlock({ [YEAR]: 'podzim 1985', [TEXT]: 'Něco.' }))
    expect(byCode(result, 'invalid_biography')[0]).toMatchObject({ value: 'podzim 1985', location: { column: YEAR } })
  })

  it('refuses a block marker or {ZIVOTOPIS} inside an entry, but allows variables', () => {
    const withBlock = run(markedBlock({ [YEAR]: '1985', [TEXT]: 'Viz {BLOK B_Marie_2_X}.' }))
    expect(byCode(withBlock, 'invalid_biography')).toHaveLength(1)

    const withVariable = run(markedBlock({ [YEAR]: '1985', [TEXT]: '{JMENO} se vdává.' }))
    expect(withVariable.errors).toEqual([])
  })

  it('refuses {ZIVOTOPIS} in a variant`s text', () => {
    const result = run(markedBlock({ 'Variation Text': 'Text {ZIVOTOPIS}' }))
    expect(byCode(result, 'invalid_biography')[0]?.location.column).toBe('Variation Text')
  })

  it('lets a biography-only block go without a marker', () => {
    const result = run([...markedBlock(), alwaysBlock()])
    expect(result.errors).toEqual([])
  })

  it('still wants a marker for a block with text and a biography', () => {
    const result = run([...markedBlock(), { ...alwaysBlock(), 'Variation Text': 'Text, který se tiskne.' }])
    expect(byCode(result, 'block_without_marker').map((issue) => issue.value)).toEqual(['B_Marie_2_Vzdy'])
  })

  it('carries the entries to the engine config with their sheet row as order', () => {
    const result = run(markedBlock({ [YEAR]: '1985', [TEXT]: 'Zaučuje se.' }, [{ [YEAR]: '1986', [TEXT]: 'Vede.' }]))
    const config = toEngineConfig(result.config)
    expect(config.blocks[0]?.variations[0]?.biography).toEqual([
      { year: 1985, text: 'Zaučuje se.', order: 2 },
      { year: 1986, text: 'Vede.', order: 3 },
    ])
    expect(config.blocks[0]?.variations[1]).not.toHaveProperty('biography')
  })

  it('reads a sheet without the biography columns as before', () => {
    const workbook = buildWorkbook()
    const content = workbook.get('2_Content') ?? []
    const keep = (content[0] ?? []).map((header, index) => (header === YEAR || header === TEXT ? -1 : index))
    workbook.set(
      '2_Content',
      content.map((row) => row.filter((_, index) => keep[index] !== -1)),
    )
    const result = importWorkbook(workbook, defaultTemplates())
    expect(result.errors).toEqual([])
  })
})

describe('the {ZIVOTOPIS} marker (§8.4)', () => {
  it('is a known variable', () => {
    const result = run(markedBlock({ [YEAR]: '1985', [TEXT]: 'Něco.' }))
    expect(byCode(result, 'invalid_template_marker')).toEqual([])
  })

  it('may stand in a template only once', () => {
    const twice = { ...MARIE_TEMPLATE, markdown: `${MARIE_TEMPLATE.markdown}\n\n{ZIVOTOPIS}` }
    const result = run(markedBlock(), [twice, ...defaultTemplates().slice(1)])
    expect(byCode(result, 'invalid_template_marker')[0]?.message).toContain('2×')
  })

  it('warns when an owner has entries but the template has nowhere to print them', () => {
    const without = { filename: 'Marie_2.md', markdown: '# Marie\n{BLOK B_Marie_2_X}' }
    const result = run([...markedBlock(), alwaysBlock()], [without, ...defaultTemplates().slice(1)])
    expect(byCode(result, 'biography_without_marker')).toMatchObject([{ severity: 'warning', value: 'Marie_2.md' }])
  })

  it('does not warn an owner without entries', () => {
    const without = { filename: 'Marie_2.md', markdown: '# Marie\n{BLOK B_Marie_2_X}' }
    const result = run(markedBlock(), [without, ...defaultTemplates().slice(1)])
    expect(byCode(result, 'biography_without_marker')).toEqual([])
  })
})
