import { describe, expect, it } from 'vitest'
import { createInitialState } from '@/engine'
import { runFixture } from '@/testing/fixture-run'
import { outputOverview } from './output-overview'

const fixture = runFixture()

/** After chapter 1 Marie is married to Mirek; chapter 2's variants are chosen. */
const overview = outputOverview(fixture.config, fixture.chapter1.state, 2)
const marie = overview.characters.find((entry) => entry.owner.id === 'Marie')

describe('outputOverview', () => {
  it('má řádek pro každou postavu a skupinu z registru', () => {
    expect(overview.characters.map((entry) => entry.owner.id)).toEqual(fixture.config.characters.map(({ id }) => id))
    expect(overview.groups.map((entry) => entry.owner.id)).toEqual(fixture.config.groups.map(({ id }) => id))
  })

  it('škály nesou hodnotu i rozsah dvojice postava × škála', () => {
    const regime = marie?.scales.find((scale) => scale.key === 'Regime')
    const definition = fixture.config.scales.find((scale) => scale.externalId === 'S_Marie_Regime')

    expect(regime).toMatchObject({
      value: fixture.chapter1.state.characters.Marie?.scales.Regime,
      min: definition?.min,
      max: definition?.max,
    })
  })

  it('u vdané postavy ukáže osobní i společný účet a s kým je sdílený', () => {
    expect(marie?.resources.find((resource) => resource.key === 'Wealth')?.value).toBe(
      fixture.chapter1.state.characters.Marie?.resources.Wealth,
    )
    expect(marie?.household).toMatchObject({
      householdId: 'MarieMirek',
      partnerIds: ['Mirek'],
      partnerLabels: ['Mirek Pokorný'],
    })
    expect(marie?.household?.resources.find((resource) => resource.key === 'Wealth')?.value).toBe(
      fixture.chapter1.state.households.MarieMirek?.resources.Wealth,
    )
  })

  it('po rozvodu společný účet zmizí', () => {
    const divorced = outputOverview(fixture.config, fixture.chapter2.state, 3)

    expect(divorced.characters.find((entry) => entry.owner.id === 'Marie')?.household).toBeUndefined()
  })

  it('vybrané varianty jen z bloků té kapitoly a toho vlastníka', () => {
    expect(marie?.variants.length).toBeGreaterThan(0)
    expect(marie?.variants.every((variant) => variant.blockId.startsWith('B_Marie_1_'))).toBe(true)
    expect(marie?.variants.every((variant) => variant.variationId?.startsWith(`V_${variant.blockId.slice(2)}_`))).toBe(true)
  })

  it('skupina má jen varianty', () => {
    const group = overview.groups[0]

    expect(group?.scales).toEqual([])
    expect(group?.resources).toEqual([])
    expect(group?.variants.length).toBeGreaterThan(0)
  })

  it('kapitola 1 nemá žádné bloky', () => {
    const first = outputOverview(fixture.config, createInitialState(fixture.config), 1)

    expect(first.characters.every((entry) => entry.variants.length === 0)).toBe(true)
  })
})
