import { describe, expect, it } from 'vitest'
import { inputKeys, literalAmount, parseScaleImpact, splitImpactId } from './scale-impact'

describe('parseScaleImpact', () => {
  it('empty cell means no impact', () => {
    expect(parseScaleImpact('')).toEqual({ impacts: [], problems: [] })
    expect(parseScaleImpact(undefined)).toEqual({ impacts: [], problems: [] })
    expect(parseScaleImpact('   ')).toEqual({ impacts: [], problems: [] })
  })

  it('reads a single scale shift', () => {
    const { impacts, problems } = parseScaleImpact('S_Marie_Regime+3')
    expect(problems).toEqual([])
    expect(impacts[0]!).toMatchObject({
      externalId: 'S_Marie_Regime',
      kind: 'skala',
      owner: 'Marie',
      key: 'Regime',
      forcedPrivate: false,
      mode: 'posun',
      fromAnswer: false,
    })
    expect(literalAmount(impacts[0]!)).toBe(3)
  })

  it('reads a negative shift', () => {
    const { impacts } = parseScaleImpact('S_Marie_Regime-2')
    expect(literalAmount(impacts[0]!)).toBe(-2)
  })

  it('tells a resource from a scale by its prefix', () => {
    const { impacts } = parseScaleImpact('R_Marie_Wealth+3')
    expect(impacts[0]!).toMatchObject({ kind: 'zdroj', key: 'Wealth', forcedPrivate: false })
  })

  it('reads the _private suffix as routing, not as part of the key', () => {
    const { impacts } = parseScaleImpact('R_Marie_Wealth_private+3')
    expect(impacts[0]!).toMatchObject({
      externalId: 'R_Marie_Wealth',
      key: 'Wealth',
      forcedPrivate: true,
    })
  })

  it('does not treat _private as routing on a scale', () => {
    const { impacts } = parseScaleImpact('S_Marie_Wealth_private+1')
    expect(impacts[0]!).toMatchObject({ key: 'Wealth_private', forcedPrivate: false })
  })

  it('accepts a household as the owner of a resource', () => {
    const { impacts } = parseScaleImpact('R_AntoninMarketa_Wealth+2')
    expect(impacts[0]!).toMatchObject({ owner: 'AntoninMarketa', key: 'Wealth' })
  })

  it('reads the mixed list from the spec, separated by commas', () => {
    const { impacts, problems } = parseScaleImpact('S_Marie_Regime-2, R_Marie_Wealth+3')
    expect(problems).toEqual([])
    expect(impacts.map((i) => [i.externalId, literalAmount(i)])).toEqual([
      ['S_Marie_Regime', -2],
      ['R_Marie_Wealth', 3],
    ])
  })

  it('accepts semicolons too, as the real sheet uses them', () => {
    const { impacts, problems } = parseScaleImpact('S_Karel_Regime+2;S_Karel_Control+1')
    expect(problems).toEqual([])
    expect(impacts).toHaveLength(2)
  })

  it('keeps +0 as a real impact rather than dropping it', () => {
    const { impacts } = parseScaleImpact('S_Marie_Control+0')
    expect(literalAmount(impacts[0]!)).toBe(0)
  })

  it('keeps an underscore inside a key', () => {
    const { impacts } = parseScaleImpact('S_Marie_Vztah_k_rezimu+1')
    expect(impacts[0]!).toMatchObject({ owner: 'Marie', key: 'Vztah_k_rezimu' })
  })

  it('reads =VALUE as an absolute set fed by the answer', () => {
    const { impacts, problems } = parseScaleImpact('S_Marie_Regime=VALUE')
    expect(problems).toEqual([])
    expect(impacts[0]!).toMatchObject({ mode: 'absolutni', fromAnswer: true, terms: [] })
    expect(literalAmount(impacts[0]!)).toBeUndefined()
  })

  it('reads a literal absolute value', () => {
    const { impacts } = parseScaleImpact('S_Marie_Regime=7')
    expect(impacts[0]!).toMatchObject({ mode: 'absolutni', fromAnswer: false })
    expect(literalAmount(impacts[0]!)).toBe(7)
  })

  it('reads a single {input} placeholder as the amount', () => {
    const { impacts, problems } = parseScaleImpact('R_Antonin_Wealth-{input}')
    expect(problems).toEqual([])
    expect(impacts[0]!.terms).toEqual([{ sign: -1, inputKey: 'input' }])
    expect(literalAmount(impacts[0]!)).toBeUndefined()
    expect(inputKeys(impacts[0]!)).toEqual(['input'])
  })

  it('reads the marriage transfer: the same name on both sides', () => {
    const { impacts, problems } = parseScaleImpact(
      'R_Antonin_Wealth-{input}, R_AntoninMarketa_Wealth+{input}',
    )
    expect(problems).toEqual([])
    expect(impacts.map((i) => [i.owner, i.terms[0]!.sign, i.terms[0]!.inputKey])).toEqual([
      ['Antonin', -1, 'input'],
      ['AntoninMarketa', 1, 'input'],
    ])
  })

  it('reads the divorce split: several inputs in one amount', () => {
    const { impacts, problems } = parseScaleImpact('R_AntoninMarketa_Wealth-{input1}-{input2}')
    expect(problems).toEqual([])
    expect(inputKeys(impacts[0]!)).toEqual(['input1', 'input2'])
    expect(impacts[0]!.terms.every((t) => t.sign === -1)).toBe(true)
  })

  it('reads an absolute set from a sum of inputs', () => {
    const { impacts } = parseScaleImpact('R_AntoninMarketa_Wealth = {input1}+{input2}')
    expect(impacts[0]!).toMatchObject({ mode: 'absolutni', fromAnswer: false })
    expect(inputKeys(impacts[0]!)).toEqual(['input1', 'input2'])
  })

  it('tolerates spaces around the sign and the separator', () => {
    const { impacts, problems } = parseScaleImpact('  S_Marie_Regime + 2 ,  S_Marie_Control - 1 ')
    expect(problems).toEqual([])
    expect(impacts.map(literalAmount)).toEqual([2, -1])
  })

  it('reports a missing sign instead of silently ignoring it', () => {
    const { impacts, problems } = parseScaleImpact('S_Marie_Regime3')
    expect(impacts).toEqual([])
    expect(problems[0]!.reason).toBe('chybi_znamenko')
  })

  it('reports a missing prefix', () => {
    const { problems } = parseScaleImpact('Marie_Wealth+3')
    expect(problems[0]!.reason).toBe('chybi_prefix')
  })

  it('reports a non-numeric magnitude', () => {
    const { problems } = parseScaleImpact('S_Marie_Regime+hodne')
    expect(problems[0]!.reason).toBe('necislo')
  })

  it('does not silently swallow trailing junk after a number', () => {
    const { impacts, problems } = parseScaleImpact('S_Marie_Regime+3x')
    expect(impacts).toEqual([])
    expect(problems[0]!.reason).toBe('necislo')
  })

  it('reports an unnamed placeholder', () => {
    const { problems } = parseScaleImpact('R_Marie_Wealth+{}')
    expect(problems[0]!.reason).toBe('prazdny_input')
  })

  it('collects every problem in a cell, not just the first', () => {
    const { impacts, problems } = parseScaleImpact('S_Marie_Wealth3, S_Marie_Regime-2, Control+1')
    expect(problems).toHaveLength(2)
    expect(impacts).toHaveLength(1)
  })

  it('a decimal is not a valid shift — scales are integers', () => {
    const { problems } = parseScaleImpact('S_Marie_Regime+1.5')
    expect(problems[0]!.reason).toBe('necislo')
  })

  it('survives diacritics in the owner part', () => {
    const { impacts } = parseScaleImpact('S_Věra_Regime+3')
    expect(impacts[0]!).toMatchObject({ owner: 'Věra', key: 'Regime' })
  })
})

describe('splitImpactId', () => {
  it('splits a full scale ID', () => {
    expect(splitImpactId('S_Marie_Regime')).toEqual({
      kind: 'skala',
      owner: 'Marie',
      key: 'Regime',
    })
  })

  it('splits a full resource ID', () => {
    expect(splitImpactId('R_MarieMirek_Wealth')).toEqual({
      kind: 'zdroj',
      owner: 'MarieMirek',
      key: 'Wealth',
    })
  })

  it('returns undefined for something that is not an impact ID', () => {
    expect(splitImpactId('A_Marie_1_1_Karel')).toBeUndefined()
    expect(splitImpactId('S_Marie')).toBeUndefined()
  })
})
