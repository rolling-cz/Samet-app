/**
 * The impacts a household effect brings with it (§4.4). Numbers in a printed
 * document depend on this, so both directions are checked by value.
 */
import { describe, expect, it } from 'vitest'
import { householdEffectImpacts } from './household-effect-impacts'
import type { ParsedAnswerEffect } from './types/parsed-question'

const effect = (name: ParsedAnswerEffect['name'], args: string[]): ParsedAnswerEffect => ({
  name,
  args,
  raw: `${name}(${args.join(', ')})`,
  location: { sheet: '2_Questions' },
})

const shape = (name: ParsedAnswerEffect['name'], args: string[]) =>
  householdEffectImpacts(effect(name, args)).map((impact) => ({
    externalId: impact.externalId,
    forcedPrivate: impact.forcedPrivate,
    terms: impact.terms,
  }))

describe('HOUSEHOLD_CREATE', () => {
  it('takes from both personal accounts and adds the sum to the joint one', () => {
    expect(shape('HOUSEHOLD_CREATE', ['Marie', 'Mirek'])).toEqual([
      {
        externalId: 'R_Marie_Wealth',
        forcedPrivate: true,
        terms: [{ sign: -1, inputKey: 'input1' }],
      },
      {
        externalId: 'R_Mirek_Wealth',
        forcedPrivate: true,
        terms: [{ sign: -1, inputKey: 'input2' }],
      },
      {
        externalId: 'R_MarieMirek_Wealth',
        forcedPrivate: false,
        terms: [
          { sign: 1, inputKey: 'input1' },
          { sign: 1, inputKey: 'input2' },
        ],
      },
    ])
  })

  it('names the joint account alphabetically, whatever order the author wrote', () => {
    expect(shape('HOUSEHOLD_CREATE', ['Mirek', 'Marie'])[2]?.externalId).toBe('R_MarieMirek_Wealth')
  })

  it('keeps `{input1}` on the first character the author wrote, not on the first alphabetically', () => {
    expect(shape('HOUSEHOLD_CREATE', ['Mirek', 'Marie'])[0]).toMatchObject({
      externalId: 'R_Mirek_Wealth',
      terms: [{ sign: -1, inputKey: 'input1' }],
    })
  })

  it('always lands on the personal account — a spouse-to-be is still single', () => {
    const [first, second] = shape('HOUSEHOLD_CREATE', ['Marie', 'Mirek'])
    expect(first?.forcedPrivate).toBe(true)
    expect(second?.forcedPrivate).toBe(true)
  })
})

describe('HOUSEHOLD_DISSOLVE', () => {
  it('pays both members out of the joint account', () => {
    expect(shape('HOUSEHOLD_DISSOLVE', ['Marie', 'Mirek'])).toEqual([
      {
        externalId: 'R_Marie_Wealth',
        forcedPrivate: true,
        terms: [{ sign: 1, inputKey: 'input1' }],
      },
      {
        externalId: 'R_Mirek_Wealth',
        forcedPrivate: true,
        terms: [{ sign: 1, inputKey: 'input2' }],
      },
      {
        externalId: 'R_MarieMirek_Wealth',
        forcedPrivate: false,
        terms: [
          { sign: -1, inputKey: 'input1' },
          { sign: -1, inputKey: 'input2' },
        ],
      },
    ])
  })
})

describe('an effect that names fewer than two members', () => {
  it('derives nothing — the validation reports the effect itself', () => {
    expect(householdEffectImpacts(effect('HOUSEHOLD_CREATE', ['Marie']))).toEqual([])
  })
})

describe('every derived impact says which effect it came from', () => {
  it('carries the raw effect, because the author wrote no such line', () => {
    const impacts = householdEffectImpacts(effect('HOUSEHOLD_CREATE', ['Marie', 'Mirek']))
    for (const impact of impacts) {
      expect(impact.derivedFrom).toBe('HOUSEHOLD_CREATE(Marie, Mirek)')
    }
  })
})
