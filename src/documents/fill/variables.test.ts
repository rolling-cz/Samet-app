import { describe, expect, it } from 'vitest'
import { KNOWN_VARIABLES } from '@/import/template'
import { runFixture } from '@/testing/fixture-run'
import { variablesFor } from './variables'

const fixture = runFixture()

/** After chapter 1 Marie is married to Mirek; after chapter 2 they are divorced. */
const marriedState = fixture.chapter1.state
const divorcedState = fixture.chapter2.state

const marie = { kind: 'character', id: 'Marie' } as const

describe('variablesFor', () => {
  it('dosadí jméno a příjmení z registru', () => {
    const variables = variablesFor(fixture.config, marriedState, marie)

    expect(variables.JMENO).toBe('Marie')
    expect(variables.PRIJMENI).toBe('Balážová')
  })

  it('dosadí škály postavy', () => {
    const variables = variablesFor(fixture.config, marriedState, marie)

    expect(variables.S_Regime).toBe(String(marriedState.characters.Marie?.scales.Regime))
  })

  it('vdaná postava čte R_Wealth ze společného účtu a _private z osobního', () => {
    const variables = variablesFor(fixture.config, marriedState, marie)
    const householdId = marriedState.characters.Marie?.householdId

    expect(householdId).toBe('MarieMirek')
    expect(variables.R_Wealth).toBe(String(marriedState.households.MarieMirek?.resources.Wealth))
    expect(variables.R_Wealth_private).toBe(String(marriedState.characters.Marie?.resources.Wealth))
  })

  it('po rozvodu míří R_Wealth na osobní účet', () => {
    const variables = variablesFor(fixture.config, divorcedState, marie)

    expect(divorcedState.characters.Marie?.householdId).toBeUndefined()
    expect(variables.R_Wealth).toBe(String(divorcedState.characters.Marie?.resources.Wealth))
    expect(variables.R_Wealth).toBe(variables.R_Wealth_private)
  })

  it('skupina dostane jen svůj název', () => {
    const variables = variablesFor(fixture.config, marriedState, { kind: 'group', id: 'Funkcionari' })

    expect(variables).toEqual({ NAZEV: 'Funkcionáři' })
  })

  it('každá proměnná ze seznamu importu je naplnitelná', () => {
    const character = variablesFor(fixture.config, marriedState, marie)
    const group = variablesFor(fixture.config, marriedState, { kind: 'group', id: 'Funkcionari' })

    for (const name of KNOWN_VARIABLES) {
      expect(character[name] ?? group[name], `proměnná {${name}} nemá odkud brát hodnotu`).toBeTypeOf('string')
    }
  })

  it('neznámý vlastník nevrací nic, místo aby spadl', () => {
    expect(variablesFor(fixture.config, marriedState, { kind: 'character', id: 'Nikdo' })).toEqual({})
  })
})
