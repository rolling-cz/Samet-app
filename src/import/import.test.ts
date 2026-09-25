/**
 * The import end to end.
 *
 * Built on hand-made workbooks rather than a file, so each test shows the one
 * row it is about. The real fixtures in `documents/` are exercised separately
 * in `fixtures.test.ts`.
 */
import { describe, expect, it } from 'vitest'
import { importWorkbook } from './import-config'
import { buildWorkbook, defaultTemplates, type Row, type WorkbookParts } from './testing/build-workbook'
import type { ImportResult } from './types/import-result'

const run = (parts: WorkbookParts = {}): ImportResult => importWorkbook(buildWorkbook(parts))

const withTemplates = (parts: WorkbookParts = {}): ImportResult =>
  importWorkbook(buildWorkbook(parts), defaultTemplates())

const byCode = (result: ImportResult, code: string) =>
  result.issues.filter((issue) => issue.code === code)

/** A question of Marie's whose only answer carries the given impact. */
const impactOf = (impact: string, extra: Record<string, string> = {}) => ({
  questions: [
    {
      Character: 'Marie',
      Type: 'single',
      Text: 'Otázka?',
      'ID Answer': 'A_Marie_2_1_X',
      'Text response': 'X',
      'Scale and Resources Impact': impact,
      ...extra,
    },
  ],
  content: [{ Character: 'Marie', 'Block ID': 'B_Marie_2_X', 'Variation ID': 'V_A' }],
})

describe('a workbook the author got right', () => {
  it('is usable', () => {
    const result = run()
    expect(result.errors.map((e) => `${e.code} ${e.location.sheet}`)).toEqual([])
    expect(result.usable).toBe(true)
  })

  it('keeps diacritics in names intact', () => {
    expect(run().config.characters[0]?.lastName).toBe('Balážová')
  })

  it('reads the groups registry — ID and name, nothing about membership', () => {
    expect(run().config.groups[0]).toEqual({
      externalId: 'SrdceParty',
      name: 'Srdce party',
      location: expect.anything(),
    })
  })

  it('groups the answer rows under the question that starts above them', () => {
    const questions = run().config.questions.get(2) ?? []
    expect(questions).toHaveLength(1)
    expect(questions[0]?.options.map((o) => o.externalId)).toEqual([
      'A_Marie_2_1_Ano',
      'A_Marie_2_1_Ne',
    ])
  })
})

describe('scales and resources are two different things (§4.1)', () => {
  it('reads Min, Max and the default per pair of character and scale', () => {
    const result = run({
      scales: [
        { Character: 'Marie', ID: 'S_Marie_Control', Min: '1', Max: '10', Default: '2' },
        { Character: 'Mirek', ID: 'S_Mirek_Control', Min: '1', Max: '5', Default: '4' },
      ],
      ...impactOf('S_Marie_Control+1'),
    })
    expect(result.config.scales).toEqual([
      expect.objectContaining({ externalId: 'S_Marie_Control', min: 1, max: 10, defaultValue: 2 }),
      expect.objectContaining({ externalId: 'S_Mirek_Control', min: 1, max: 5, defaultValue: 4 }),
    ])
  })

  it('rejects Min above Max', () => {
    const result = run({
      scales: [{ Character: 'Marie', ID: 'S_Marie_Regime', Min: '8', Max: '3', Default: '5' }],
    })
    expect(byCode(result, 'value_out_of_range')[0]?.message).toContain('menší než horní')
  })

  it('rejects a default outside the range', () => {
    const result = run({
      scales: [{ Character: 'Marie', ID: 'S_Marie_Regime', Min: '1', Max: '10', Default: '14' }],
    })
    expect(byCode(result, 'value_out_of_range')[0]?.message).toContain('14')
  })

  it('rejects the same pair twice', () => {
    const result = run({
      scales: [
        { Character: 'Marie', ID: 'S_Marie_Regime', Min: '1', Max: '10', Default: '5' },
        { Character: 'Marie', ID: 'S_Marie_Regime', Min: '1', Max: '10', Default: '6' },
      ],
    })
    expect(byCode(result, 'duplicate_id')[0]?.value).toBe('S_Marie_Regime')
  })

  it('reads a resource scope and gives resources no bounds to break', () => {
    expect(run().config.resources[0]).toMatchObject({
      externalId: 'R_Marie_Wealth',
      scope: 'household',
    })
  })

  it('reports a resource whose rows disagree about its scope', () => {
    const result = run({
      resources: [
        { Character: 'Marie', ID: 'R_Marie_Wealth', Scope: 'household', Default: '4' },
        { Character: 'Mirek', ID: 'R_Mirek_Wealth', Scope: 'private', Default: '6' },
      ],
    })
    expect(result.errors.some((issue) => issue.message.includes('rozsah patří zdroji'))).toBe(true)
  })

  it('rejects a scale ID that is not one', () => {
    const result = run({
      scales: [{ Character: 'Marie', ID: 'Regime', Min: '1', Max: '10', Default: '5' }],
    })
    expect(result.errors.some((issue) => issue.message.includes('není ID škály'))).toBe(true)
  })
})

describe('routing of resource impacts (§4.4)', () => {
  it('leaves a plain resource impact to be routed by marital status', () => {
    const impact = run(impactOf('R_Marie_Wealth+3')).config.questions.get(2)?.[0]?.options[0]
      ?.impacts[0]
    expect(impact).toMatchObject({ kind: 'resource', forcedPrivate: false })
  })

  it('honours the _private suffix', () => {
    const impact = run(impactOf('R_Marie_Wealth_private+3')).config.questions.get(2)?.[0]
      ?.options[0]?.impacts[0]
    expect(impact).toMatchObject({ externalId: 'R_Marie_Wealth', forcedPrivate: true })
  })

  it('reads the Private flag on the question', () => {
    const result = run(impactOf('R_Marie_Wealth+3', { Private: 'ano' }))
    expect(result.config.questions.get(2)?.[0]?.isPrivate).toBe(true)
  })

  it('accepts a joint account written by its derived household ID', () => {
    const result = run(impactOf('R_Marie_Wealth-{input}, R_MarieMirek_Wealth+{input}'))
    const impacts = result.config.questions.get(2)?.[0]?.options[0]?.impacts ?? []
    expect(impacts.map((i) => i.owner)).toEqual(['Marie', 'MarieMirek'])
    expect(byCode(result, 'unknown_resource')).toEqual([])
  })

  it('says a household ID written backwards is just out of order', () => {
    const result = run(impactOf('R_MirekMarie_Wealth+2'))
    expect(byCode(result, 'household_order')[0]).toMatchObject({
      value: 'MirekMarie',
      suggestion: 'MarieMirek',
    })
  })

  it('rejects an absolute resource set that does not name a concrete account', () => {
    const result = run({
      questions: [
        {
          Character: 'Marie',
          Type: 'resource_direct',
          Text: 'Stav účtu',
          'ID Answer': 'A_Marie_2_1_VALUE',
          'Text response': 'Nová hodnota',
          'Scale and Resources Impact': 'R_Marie_Wealth=VALUE',
        },
      ],
      content: [{ Character: 'Marie', 'Block ID': 'B_Marie_2_X', 'Variation ID': 'V_A' }],
    })
    expect(
      result.errors.some((issue) => issue.message.includes('nejmenuje konkrétní účet')),
    ).toBe(true)
  })
})

describe('question and answer IDs (§4.2, §6.1)', () => {
  it('derives a question ID the author left empty, per character and chapter', () => {
    const result = run({
      questions: [
        { Character: 'Marie', Type: 'bool', Text: 'První?', 'Text response': 'Ano' },
        { Type: 'bool', Text: 'Druhá?', 'Text response': 'Ano' },
        { Character: 'Mirek', Type: 'bool', Text: 'První?', 'Text response': 'Ano' },
      ],
      content: [{ Character: 'Marie', 'Block ID': 'B_Marie_2_X', 'Variation ID': 'V_A' }],
    })
    expect((result.config.questions.get(2) ?? []).map((q) => q.externalId)).toEqual([
      'Q_Marie_2_1',
      'Q_Marie_2_2',
      'Q_Mirek_2_1',
    ])
    expect(result.config.repairs.derivedQuestionIds).toBe(3)
  })

  it('keeps an ID the author wrote', () => {
    const question = run().config.questions.get(2)?.[0]
    expect(question).toMatchObject({ externalId: 'Q_Marie_2_1', idWasDerived: false })
  })

  it('derives bool answer IDs from the Ano / Ne text', () => {
    const result = run({
      questions: [
        {
          Character: 'Marie',
          Type: 'bool',
          Text: 'Otázka?',
          'Text response': 'Ne',
          'Scale and Resources Impact': 'S_Marie_Regime-1',
        },
      ],
      content: [{ Character: 'Marie', 'Block ID': 'B_Marie_2_X', 'Variation ID': 'V_A' }],
    })
    expect((result.config.questions.get(2)?.[0]?.options ?? []).map((o) => o.externalId)).toEqual([
      'A_Marie_2_1_Ano',
      'A_Marie_2_1_Ne',
    ])
  })

  it('adds the missing half of a bool question with no effects', () => {
    const result = run({
      questions: [
        {
          Character: 'Marie',
          Type: 'bool',
          Text: 'Otázka?',
          'Text response': 'Ano',
          'Scale and Resources Impact': 'S_Marie_Regime+1',
        },
      ],
      content: [{ Character: 'Marie', 'Block ID': 'B_Marie_2_X', 'Variation ID': 'V_A' }],
    })
    const ne = result.config.questions.get(2)?.[0]?.options.find((o) => o.label === 'Ne')
    expect(ne).toMatchObject({ externalId: 'A_Marie_2_1_Ne', isDerived: true, impacts: [] })
    expect(result.config.repairs.addedBoolAnswers).toBe(1)
  })

  it('rejects an answer text a bool question cannot have', () => {
    const result = run({
      questions: [
        { Character: 'Marie', Type: 'bool', Text: 'Otázka?', 'Text response': 'Možná' },
      ],
      content: [{ Character: 'Marie', 'Block ID': 'B_Marie_2_X', 'Variation ID': 'V_A' }],
    })
    expect(result.errors.some((issue) => issue.message.includes('Možná'))).toBe(true)
  })

  it('reports an answer row left behind a blank row', () => {
    const result = run({
      questions: [
        { Character: 'Marie', Type: 'bool', Text: 'Otázka?', 'Text response': 'Ano' },
        {},
        { 'ID Answer': 'A_Sirotek_X', 'Text response': 'Osiřelá' },
      ],
      content: [{ Character: 'Marie', 'Block ID': 'B_Marie_2_X', 'Variation ID': 'V_A' }],
    })
    expect(byCode(result, 'answer_without_question')[0]?.value).toBe('A_Sirotek_X')
  })

  it('reports a question with no answer at all', () => {
    const result = run({
      questions: [{ Character: 'Marie', Type: 'single', Text: 'Komu odkážeš dílnu?' }],
      content: [{ Character: 'Marie', 'Block ID': 'B_Marie_2_X', 'Variation ID': 'V_A' }],
    })
    expect(byCode(result, 'question_without_answers')).toHaveLength(1)
  })
})

describe('polls (§6.6)', () => {
  const pollSheet = (voteText: string): WorkbookParts => ({
    questions: [
      {
        ID: 'Q_Group_Vedouci',
        Type: 'poll',
        Text: 'Kdo povede partu?',
        'ID Answer': 'A_Group_Vedouci_Marie',
        'Text response': 'Marie',
      },
      { 'ID Answer': 'A_Group_Vedouci_Mirek', 'Text response': 'Mirek' },
      { Character: 'Marie', Type: 'poll-answer', Text: voteText },
    ],
    content: [{ Character: 'Marie', 'Block ID': 'B_Marie_2_X', 'Variation ID': 'V_A' }],
  })

  it('a poll belongs to nobody and takes no place in anyone`s order', () => {
    const poll = (run(pollSheet('Q_Group_Vedouci')).config.questions.get(2) ?? []).find(
      (q) => q.type === 'poll',
    )
    expect(poll?.characterRef).toBe('')
    expect(poll?.ordinal).toBeUndefined()
  })

  it('a vote takes its poll from the Text column and counts in the order', () => {
    const vote = (run(pollSheet('Q_Group_Vedouci')).config.questions.get(2) ?? []).find(
      (q) => q.type === 'poll-answer',
    )
    expect(vote).toMatchObject({ pollRef: 'Q_Group_Vedouci', ordinal: 1, text: '' })
    expect(vote?.options).toEqual([])
  })

  it('reports a vote pointing at a poll that is not there', () => {
    const result = run(pollSheet('Q_Group_Neexistuje'))
    expect(byCode(result, 'unknown_poll')[0]?.value).toBe('Q_Group_Neexistuje')
  })

  it('refuses a poll nobody votes in — its first row would win on zero votes', () => {
    expect(byCode(run(pollSheet('Q_Group_Vedouci')), 'poll_without_votes')).toEqual([])

    const issue = byCode(run(pollSheet('Q_Group_Neexistuje')), 'poll_without_votes')[0]
    expect(issue).toMatchObject({ value: 'Q_Group_Vedouci', location: { sheet: '2_Questions' } })
  })

  it('a poll must carry its own ID', () => {
    const result = run({
      questions: [
        {
          Type: 'poll',
          Text: 'Kdo povede partu?',
          'ID Answer': 'A_X',
          'Text response': 'Marie',
        },
      ],
      content: [{ Character: 'Marie', 'Block ID': 'B_Marie_2_X', 'Variation ID': 'V_A' }],
    })
    expect(result.errors.some((issue) => issue.message.includes('nikdy negeneruje'))).toBe(true)
  })
})

describe('a question\'s Condition is one Variation ID (§4.5)', () => {
  /** Marie's question with the given `Condition`; her block `B_Marie_2_Questions_1` decides it. */
  const conditional = (condition: string, character = 'Marie'): WorkbookParts => ({
    questions: [
      { Character: character, Condition: condition, Type: 'bool', Text: 'Otázka?', 'Text response': 'Ano' },
    ],
    content: [
      { Character: 'Marie', 'Block ID': 'B_Marie_2_X', 'Variation ID': 'V_A', 'Variation Text': 'Text' },
      {
        Character: 'Marie',
        'Block ID': 'B_Marie_2_Questions_1',
        'Variation ID': 'V_Marie_2_Questions_1_A',
        Conditions: 'S_Marie_Regime >= 5',
      },
      { 'Variation ID': 'V_Marie_2_Questions_1_B' },
      { Character: 'SrdceParty', 'Block ID': 'B_SrdceParty_2_X', 'Variation ID': 'V_SrdceParty_2_X_A' },
    ],
  })

  it('accepts a variant of the same character and chapter, and an empty cell', () => {
    const result = run(conditional('V_Marie_2_Questions_1_A'))

    expect(result.errors).toEqual([])
    expect(result.config.questions.get(2)?.[0]?.condition?.raw).toBe('V_Marie_2_Questions_1_A')
    expect(run(conditional('')).config.questions.get(2)?.[0]?.condition).toBeUndefined()
  })

  it.each([
    ['an expression', 'S_Marie_Regime >= 5 AND V_Marie_2_Questions_1_A'],
    ['a negation', '!V_Marie_2_Questions_1_A'],
    ['an answer ID', 'A_Marie_2_1_Ano'],
    ['a scale ID', 'S_Marie_Regime'],
    ['DEFAULT', 'DEFAULT'],
    ['RANDOM', 'RANDOM(50)'],
  ])('refuses %s — only a bare Variation ID may stand there', (_, condition) => {
    const result = run(conditional(condition))

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatchObject({
      code: 'question_condition_not_variation',
      value: condition,
      location: { sheet: '2_Questions', column: 'Condition' },
    })
  })

  it('refuses a variant the same chapter\'s content does not have, and suggests the near one', () => {
    const result = run(conditional('V_Marie_2_Questions_1_C'))

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatchObject({
      code: 'unknown_variation',
      value: 'V_Marie_2_Questions_1_C',
      suggestion: 'V_Marie_2_Questions_1_A',
      location: { sheet: '2_Questions', column: 'Condition' },
    })
  })

  it('looks only into the content sheet of the question\'s own chapter', () => {
    const base = conditional('')
    const result = run({
      ...base,
      extra: {
        '3_Questions': [
          ['Character', 'Condition', 'ID', 'Type', 'Text', 'ID Answer', 'Text response'],
          ['Marie', 'V_Marie_2_Questions_1_A', '', 'bool', 'Otázka?', '', 'Ano'],
        ],
      },
    })

    expect(byCode(result, 'unknown_variation')[0]).toMatchObject({
      value: 'V_Marie_2_Questions_1_A',
      location: { sheet: '3_Questions' },
    })
  })

  it('refuses a variant of another character or of a group', () => {
    expect(run(conditional('V_Marie_2_Questions_1_A', 'Mirek')).errors.map((issue) => issue.code)).toEqual([
      'foreign_variation',
    ])
    expect(run(conditional('V_SrdceParty_2_X_A')).errors.map((issue) => issue.code)).toEqual(['foreign_variation'])
  })

  it('does not call a block orphaned when only a Condition points at it', () => {
    const templates = [
      { filename: 'Marie_2.md', markdown: '# Marie\n{BLOK B_Marie_2_X}' },
      { filename: 'Mirek_2.md', markdown: '# Mirek' },
      { filename: 'SrdceParty_2.md', markdown: '# Srdce party\n{BLOK B_SrdceParty_2_X}' },
    ]
    const orphans = (condition: string) =>
      byCode(importWorkbook(buildWorkbook(conditional(condition)), templates), 'block_without_marker').map(
        (issue) => issue.value,
      )

    expect(orphans('V_Marie_2_Questions_1_A')).toEqual([])
    // No marker and no reference: the same block is reported.
    expect(orphans('')).toEqual(['B_Marie_2_Questions_1'])
  })
})

describe('variant ordering (§8.2)', () => {
  const block = (rows: Record<string, string>[]) =>
    run({ content: rows.map((row, index) => (index === 0 ? { Character: 'Marie', 'Block ID': 'B_Marie_2_X', ...row } : row)) })

  it('orders by rows when no variant carries a priority', () => {
    const result = block([
      { 'Variation ID': 'V_A', 'Variation Text': 'A', Conditions: 'A_Marie_2_1_Ano' },
      { 'Variation ID': 'V_B', 'Variation Text': 'B' },
    ])
    const variations = result.config.blocks.get(2)?.[0]?.variations ?? []
    expect(variations.map((v) => [v.ordinal, v.priority])).toEqual([
      [1, undefined],
      [2, undefined],
    ])
    expect(result.usable).toBe(true)
  })

  it('treats an empty condition as the fallback, same as DEFAULT', () => {
    const result = block([
      { 'Variation ID': 'V_A', 'Variation Text': 'A', Conditions: 'A_Marie_2_1_Ano' },
      { 'Variation ID': 'V_B', 'Variation Text': 'B' },
    ])
    expect(result.config.blocks.get(2)?.[0]?.variations[1]?.isFallback).toBe(true)
    expect(byCode(result, 'block_without_default')).toEqual([])
  })

  it('accepts a fallback written first but numbered last', () => {
    const result = block([
      { 'Variation ID': 'V_A', 'Variation Text': 'A', Priority: '9', Conditions: 'DEFAULT' },
      { 'Variation ID': 'V_B', 'Variation Text': 'B', Priority: '1', Conditions: 'A_Marie_2_1_Ano' },
    ])
    expect(result.errors).toEqual([])
  })

  it('rejects a priority filled in on only some variants', () => {
    const result = block([
      { 'Variation ID': 'V_A', 'Variation Text': 'A', Priority: '1', Conditions: 'A_Marie_2_1_Ano' },
      { 'Variation ID': 'V_B', 'Variation Text': 'B', Conditions: 'DEFAULT' },
    ])
    expect(byCode(result, 'missing_priority')[0]?.message).toContain('`V_B`')
  })

  it('rejects two variants of one block sharing a priority', () => {
    const result = block([
      { 'Variation ID': 'V_A', 'Variation Text': 'A', Priority: '1', Conditions: 'A_Marie_2_1_Ano' },
      { 'Variation ID': 'V_B', 'Variation Text': 'B', Priority: '2', Conditions: 'A_Marie_2_1_Ne' },
      { 'Variation ID': 'V_C', 'Variation Text': 'C', Priority: '2', Conditions: 'DEFAULT' },
    ])
    const issue = byCode(result, 'duplicate_priority')[0]
    expect(issue?.message).toContain('`V_B`')
    expect(issue?.message).toContain('`V_C`')
  })

  it('rejects a block with no fallback variant', () => {
    const result = block([
      { 'Variation ID': 'V_A', 'Variation Text': 'A', Priority: '1', Conditions: 'A_Marie_2_1_Ano' },
      { 'Variation ID': 'V_B', 'Variation Text': 'B', Priority: '2', Conditions: 'A_Marie_2_1_Ne' },
    ])
    expect(byCode(result, 'block_without_default')).toHaveLength(1)
  })

  it('rejects a variant standing after the fallback', () => {
    const result = block([
      { 'Variation ID': 'V_A', 'Variation Text': 'A', Priority: '1', Conditions: 'DEFAULT' },
      { 'Variation ID': 'V_B', 'Variation Text': 'B', Priority: '2', Conditions: 'A_Marie_2_1_Ano' },
    ])
    expect(byCode(result, 'unreachable_variant')[0]?.value).toBe('V_B')
  })
})

describe('nested blocks (§8.4)', () => {
  it('records the blocks a variant text refers to', () => {
    const result = run({
      content: [
        {
          Character: 'Marie',
          'Block ID': 'B_Marie_2_X',
          'Variation ID': 'V_A',
          'Variation Text': 'Text {BLOK B_Marie_2_Y}',
        },
        { Character: 'Marie', 'Block ID': 'B_Marie_2_Y', 'Variation ID': 'V_C', 'Variation Text': 'Vnořený' },
      ],
    })
    expect(result.config.blocks.get(2)?.[0]?.variations[0]?.nestedBlocks).toEqual(['B_Marie_2_Y'])
  })

  it('a block reachable only from another block still counts as reachable', () => {
    const result = withTemplates({
      content: [
        {
          Character: 'Marie',
          'Block ID': 'B_Marie_2_X',
          'Variation ID': 'V_A',
          'Variation Text': 'Text {BLOK B_Marie_2_Y}',
        },
        { Character: 'Marie', 'Block ID': 'B_Marie_2_Y', 'Variation ID': 'V_C', 'Variation Text': 'Vnořený' },
      ],
    })
    expect(byCode(result, 'block_without_marker')).toEqual([])
  })

  it('reports a cycle instead of letting the substitution loop forever', () => {
    const result = run({
      content: [
        {
          Character: 'Marie',
          'Block ID': 'B_Marie_2_X',
          'Variation ID': 'V_A',
          'Variation Text': 'A {BLOK B_Marie_2_Y}',
        },
        {
          Character: 'Marie',
          'Block ID': 'B_Marie_2_Y',
          'Variation ID': 'V_C',
          'Variation Text': 'B {BLOK B_Marie_2_X}',
        },
      ],
    })
    const issue = byCode(result, 'block_cycle')[0]
    expect(issue?.message).toContain('B_Marie_2_X')
    expect(issue?.message).toContain('B_Marie_2_Y')
  })

  it('reports a block that refers to itself', () => {
    const result = run({
      content: [
        {
          Character: 'Marie',
          'Block ID': 'B_Marie_2_X',
          'Variation ID': 'V_A',
          'Variation Text': 'A {BLOK B_Marie_2_X}',
        },
      ],
    })
    expect(byCode(result, 'block_cycle')).toHaveLength(1)
  })
})

describe('households the game starts with (§4.2)', () => {
  const married = (marieHousehold: string, mirekHousehold: string, resources?: Row[]) =>
    run({
      characters: [
        { ID: 'Marie', Name: 'Marie', Surname: 'Balážová', Household: marieHousehold },
        { ID: 'Mirek', Name: 'Mirek', Surname: 'Pokorný', Household: mirekHousehold },
      ],
      resources: resources ?? [
        { Character: 'Marie', ID: 'R_Marie_Wealth', Scope: 'household', Default: '4' },
        { Character: 'Mirek', ID: 'R_Mirek_Wealth', Scope: 'household', Default: '6' },
        { Character: 'MarieMirek', ID: 'R_MarieMirek_Wealth', Scope: 'household', Default: '0' },
      ],
    })

  it('reads the pair and the joint account`s opening balance', () => {
    const result = married('MarieMirek', 'MarieMirek')
    expect(result.errors).toEqual([])
    expect(result.config.households).toHaveLength(1)
    expect(result.config.households[0]).toMatchObject({
      externalId: 'MarieMirek',
      memberIds: ['Marie', 'Mirek'],
    })
    const joint = result.config.resources.find((r) => r.externalId === 'R_MarieMirek_Wealth')
    expect(joint).toMatchObject({ householdRef: 'MarieMirek', characterId: undefined, defaultValue: 0 })
  })

  it('refuses a household ID that is not its two members sorted alphabetically', () => {
    const issue = byCode(married('MirekMarie', 'MirekMarie'), 'invalid_household')[0]
    expect(issue).toMatchObject({ value: 'MirekMarie', suggestion: 'MarieMirek' })
  })

  it('refuses a household only one character carries', () => {
    const issue = byCode(married('MarieMirek', ''), 'invalid_household')[0]
    expect(issue?.message).toContain('1 postav')
  })

  it('refuses a joint account for a household the `Household` column does not name', () => {
    const issue = byCode(
      married('', '', [
        { Character: 'Marie', ID: 'R_Marie_Wealth', Scope: 'household', Default: '4' },
        { Character: 'Mirek', ID: 'R_Mirek_Wealth', Scope: 'household', Default: '6' },
        { Character: 'MarieMirek', ID: 'R_MarieMirek_Wealth', Scope: 'household', Default: '0' },
      ]),
      'invalid_household',
    )[0]
    expect(issue?.value).toBe('MarieMirek')
  })

  it('refuses a default household with no opening balance — nothing is filled in with a zero', () => {
    const issue = byCode(
      married('MarieMirek', 'MarieMirek', [
        { Character: 'Marie', ID: 'R_Marie_Wealth', Scope: 'household', Default: '4' },
        { Character: 'Mirek', ID: 'R_Mirek_Wealth', Scope: 'household', Default: '6' },
      ]),
      'invalid_household',
    )[0]
    expect(issue?.value).toBe('R_MarieMirek_Wealth')
  })
})

describe('household effects in the `Effects` column (§4.4)', () => {
  const withEffect = (effect: string) =>
    run({
      questions: [
        {
          Character: 'Marie',
          Type: 'bool',
          Text: 'Došlo ke sňatku?',
          'Text response': 'Ano',
          Effects: effect,
        },
      ],
      content: [{ Character: 'Marie', 'Block ID': 'B_Marie_2_X', 'Variation ID': 'V_A' }],
    })

  const optionOf = (result: ImportResult) => result.config.questions.get(2)?.[0]?.options[0]

  it('reads both members out of one call — the comma inside it is not a separator', () => {
    const result = withEffect('HOUSEHOLD_CREATE(Marie, Mirek)')
    expect(result.errors).toEqual([])
    expect(optionOf(result)?.effects).toHaveLength(1)
    expect(optionOf(result)?.effects[0]).toMatchObject({
      name: 'HOUSEHOLD_CREATE',
      args: ['Marie', 'Mirek'],
    })
  })

  it('derives the transfer the author never writes', () => {
    const impacts = optionOf(withEffect('HOUSEHOLD_CREATE(Marie, Mirek)'))?.impacts ?? []
    expect(impacts.map((impact) => impact.externalId)).toEqual([
      'R_Marie_Wealth',
      'R_Mirek_Wealth',
      'R_MarieMirek_Wealth',
    ])
  })

  it('takes a semicolon between two effects', () => {
    const result = withEffect('HOUSEHOLD_DISSOLVE(Marie, Mirek); HOUSEHOLD_CREATE(Marie, Mirek)')
    expect(result.errors).toEqual([])
    expect(optionOf(result)?.effects.map((effect) => effect.name)).toEqual([
      'HOUSEHOLD_DISSOLVE',
      'HOUSEHOLD_CREATE',
    ])
  })

  it('reports an effect name nobody implements', () => {
    expect(byCode(withEffect('VEDENI(SrdceParty, Mirek)'), 'invalid_effect')[0]?.value).toBe('VEDENI')
  })

  it('reports a call with one member — a household is a pair', () => {
    const issue = byCode(withEffect('HOUSEHOLD_CREATE(Marie)'), 'invalid_effect')[0]
    expect(issue?.message).toContain('čeká 2')
  })

  it('reports the same character named twice', () => {
    expect(byCode(withEffect('HOUSEHOLD_CREATE(Marie, Marie)'), 'invalid_effect')[0]?.value).toBe(
      'Marie',
    )
  })

  it('reports a member the registry does not know, with a suggestion', () => {
    const issue = byCode(withEffect('HOUSEHOLD_CREATE(Marie, Mrek)'), 'unknown_character')[0]
    expect(issue).toMatchObject({ value: 'Mrek', suggestion: 'Mirek' })
  })

  it('reports a call it cannot read at all', () => {
    expect(byCode(withEffect('HOUSEHOLD_CREATE Marie Mirek'), 'invalid_effect')).toHaveLength(1)
  })
})

describe('blocks may belong to a group (§8.2)', () => {
  it('accepts a group in the Character column', () => {
    const result = run({
      content: [{ Character: 'SrdceParty', 'Block ID': 'B_Skupina_2_X', 'Variation ID': 'V_A' }],
    })
    expect(result.config.blocks.get(2)?.[0]).toMatchObject({
      groupId: 'SrdceParty',
      characterId: undefined,
    })
  })

  it('reports an owner that is neither a character nor a group', () => {
    const result = run({
      content: [{ Character: 'Nikdo', 'Block ID': 'B_2_X', 'Variation ID': 'V_A' }],
    })
    expect(byCode(result, 'unknown_character')[0]?.value).toBe('Nikdo')
  })
})

describe('conditions reference scales and resources (§4.5)', () => {
  const condition = (expression: string) =>
    run({
      content: [
        {
          Character: 'Marie',
          'Block ID': 'B_Marie_2_X',
          'Variation ID': 'V_A',
          'Variation Text': 'A',
          Priority: '1',
          Conditions: expression,
        },
        { 'Variation ID': 'V_B', 'Variation Text': 'B', Priority: '2', Conditions: 'DEFAULT' },
      ],
    })

  it('accepts a resource comparison', () => {
    expect(condition('R_Marie_Wealth >= 7').errors).toEqual([])
  })

  it('reports a typo in a scale ID with a suggestion', () => {
    const issue = byCode(condition('S_Marie_Regme >= 7'), 'unknown_scale')[0]
    expect(issue).toMatchObject({ value: 'S_Marie_Regme', suggestion: 'S_Marie_Regime' })
  })

  it('reports an unclosed bracket at the cell it sits in', () => {
    const issue = byCode(condition('!(A_Marie_2_1_Ano OR A_Marie_2_1_Ne'), 'invalid_expression')[0]
    expect(issue?.location).toMatchObject({ sheet: '2_Content', column: 'Conditions' })
    expect(issue?.message).toContain('uzavírací závorka')
  })

  it('reports an answer a condition invents', () => {
    expect(byCode(condition('A_Marie_2_1_Mozna'), 'unknown_answer')[0]?.value).toBe(
      'A_Marie_2_1_Mozna',
    )
  })
})

describe('tolerance the author has earned (§10.1)', () => {
  it('resolves Věra to the registry ID Vera and says so', () => {
    const result = run({
      characters: [{ ID: 'Vera', Name: 'Věra', Surname: 'Svobodová' }],
      scales: [{ Character: 'Věra', ID: 'S_Vera_Regime', Min: '1', Max: '10', Default: '5' }],
      resources: [{ Character: 'Vera', ID: 'R_Vera_Wealth', Scope: 'private', Default: '3' }],
      questions: [
        {
          Character: 'Věra',
          Type: 'bool',
          Text: 'Otázka?',
          'Text response': 'Ano',
          'Scale and Resources Impact': 'S_Vera_Regime+1',
        },
      ],
      content: [{ Character: 'Věra', 'Block ID': 'B_Vera_2_X', 'Variation ID': 'V_A' }],
    })
    const warning = byCode(result, 'unknown_character')[0]
    expect(warning).toMatchObject({ severity: 'warning', suggestion: 'Vera' })
    expect(result.config.questions.get(2)?.[0]?.characterId).toBe('Vera')
  })

  it('accepts both a comma and a semicolon between impacts', () => {
    const result = run(impactOf('S_Marie_Regime+1; R_Marie_Wealth+2'))
    expect(result.config.questions.get(2)?.[0]?.options[0]?.impacts).toHaveLength(2)
    expect(result.config.repairs.semicolonSeparators).toBe(1)
  })
})

describe('a broken workbook never takes the app down (§10.1)', () => {
  it('reports a missing required sheet rather than throwing', () => {
    const result = importWorkbook(new Map())
    expect(result.usable).toBe(false)
    expect(result.issues.map((i) => i.code)).toContain('missing_sheet')
  })

  it('reports a missing required column with its name', () => {
    const workbook = buildWorkbook()
    workbook.set('Characters', [
      ['ID', 'Name'],
      ['Marie', 'Marie'],
    ])
    const result = importWorkbook(workbook)
    expect(byCode(result, 'missing_column')[0]?.value).toBe('Surname')
  })

  it('collects every mistake in one pass instead of stopping at the first', () => {
    const result = run({
      scales: [{ Character: 'Marie', ID: 'S_Marie_Regime', Min: '8', Max: '3', Default: '99' }],
      content: [
        {
          Character: 'Nikdo',
          'Block ID': 'B_Marie_2_X',
          'Variation ID': 'V_A',
          Priority: '1',
          Conditions: 'A_Marie_2_1_Mozna',
        },
        { 'Variation ID': 'V_B', Priority: '1', Conditions: 'DEFAULT' },
      ],
    })
    const codes = new Set(result.errors.map((e) => e.code))
    expect(codes).toContain('value_out_of_range')
    expect(codes).toContain('unknown_character')
    expect(codes).toContain('unknown_answer')
    expect(codes).toContain('duplicate_priority')
  })
})

describe('templates are assigned by file name (§10.2)', () => {
  it('accepts <ID>_<kapitola>.md for a character and a group', () => {
    const result = withTemplates()
    expect(byCode(result, 'owner_without_template')).toEqual([])
    expect(byCode(result, 'invalid_template_filename')).toEqual([])
  })

  it('reports a file whose name belongs to nobody', () => {
    const result = importWorkbook(buildWorkbook(), [
      ...defaultTemplates(),
      { filename: 'poznamky.md', markdown: 'nic' },
    ])
    expect(byCode(result, 'invalid_template_filename')[0]?.value).toBe('poznamky.md')
  })

  it('reports a character left without a template for a chapter', () => {
    const result = importWorkbook(buildWorkbook(), [
      { filename: 'Marie_2.md', markdown: '{BLOK B_Marie_2_X}' },
    ])
    expect(byCode(result, 'owner_without_template').map((i) => i.value)).toContain('Mirek')
  })

  it('wants no template for chapter 1, whose documents are never printed', () => {
    const result = importWorkbook(buildWorkbook({ chapterOne: true }), defaultTemplates())
    expect(result.config.chapters).toEqual([1, 2])
    expect(byCode(result, 'owner_without_template')).toEqual([])
    expect(byCode(result, 'template_not_printed')).toEqual([])
  })

  it('accepts a chapter 1 template with one warning and does not check it', () => {
    const result = importWorkbook(buildWorkbook({ chapterOne: true }), [
      ...defaultTemplates(),
      { filename: 'Marie_1.md', markdown: '{BLOK B_Neexistuje}' },
      { filename: 'Mirek_1.md', markdown: '# Mirek' },
    ])
    expect(byCode(result, 'template_not_printed')).toHaveLength(1)
    expect(byCode(result, 'invalid_template_filename')).toEqual([])
    expect(byCode(result, 'marker_without_block')).toEqual([])
    expect(result.errors).toEqual([])
  })

  it('reports a marker no block backs, which would survive into the document', () => {
    const result = importWorkbook(buildWorkbook(), [
      { filename: 'Marie_2.md', markdown: '{BLOK B_Marie_2_X}\n{BLOK B_Neexistuje}' },
      { filename: 'Mirek_2.md', markdown: '# Mirek' },
      { filename: 'SrdceParty_2.md', markdown: '# Srdce party' },
    ])
    expect(byCode(result, 'marker_without_block')[0]?.value).toBe('B_Neexistuje')
  })
})
