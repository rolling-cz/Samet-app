import { describe, expect, it } from 'vitest'
import type { CompletionStatus } from '@/computation'
import type { CharacterListItem } from './types/character-list-item'
import { filterCharacters } from './utils/filter-characters'

const character = (externalId: string, firstName: string, lastName: string): CharacterListItem => ({
  id: `db:${externalId}`,
  externalId,
  firstName,
  lastName,
})

const characters = [
  character('Antonin', 'Antonín', 'Dvořák'),
  character('Marie', 'Marie', 'Nováková'),
  character('Vera', 'Věra', 'Šťastná'),
]

const statuses: Record<string, CompletionStatus> = { Antonin: 'done', Marie: 'in_progress', Vera: 'empty' }
const statusOf = (characterId: string): CompletionStatus | undefined => statuses[characterId]

const idsOf = (list: CharacterListItem[]): string[] => list.map((item) => item.externalId)

describe('character search', () => {
  it('ignores diacritics and case: „vera" finds Věra', () => {
    expect(idsOf(filterCharacters(characters, 'vera', false, statusOf))).toEqual(['Vera'])
    expect(idsOf(filterCharacters(characters, 'VĚRA', false, statusOf))).toEqual(['Vera'])
  })

  it('searches the surname too, and a query with diacritics finds a name typed without', () => {
    expect(idsOf(filterCharacters(characters, 'stast', false, statusOf))).toEqual(['Vera'])
    expect(idsOf(filterCharacters(characters, 'dvořák', false, statusOf))).toEqual(['Antonin'])
  })

  it('an empty query keeps everyone, in the panel\'s order', () => {
    expect(idsOf(filterCharacters(characters, '  ', false, statusOf))).toEqual(['Antonin', 'Marie', 'Vera'])
  })

  it('„jen nevyplněné" keeps empty and in progress', () => {
    expect(idsOf(filterCharacters(characters, '', true, statusOf))).toEqual(['Marie', 'Vera'])
    expect(idsOf(filterCharacters(characters, 'ma', true, statusOf))).toEqual(['Marie'])
  })
})
