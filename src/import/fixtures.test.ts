/**
 * The real fixtures in `documents/`, with the templates that belong to them.
 *
 * `fixture-platny.xlsx` must come out usable; `fixture-vadny.xlsx` carries
 * deliberate mistakes and must be refused with all of them listed at once
 * (§10.1). The expected counts come from `documents/fixtures-ocekavane-vysledky.md`,
 * which is the author's own description of what each file contains.
 *
 * The rules themselves are covered on hand-built workbooks in `import.test.ts`.
 * What only a real file can show is the part nothing else exercises: an export
 * straight out of Google Sheets, with its two-row headers, merged cells, stray
 * spaces and diacritics.
 */
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { importWorkbook } from './import-config'
import { readTemplateFiles } from './template-upload'
import type { ImportResult } from './types/import-result'
import type { UploadedTemplate } from './types/parsed-template'
import { readWorkbook } from './workbook'

/** Mistakes the faulty workbook carries, per `fixtures-ocekavane-vysledky.md`. */
const EXPECTED_WORKBOOK_ERRORS = 38

/** Mistakes that only show once the templates are uploaded (§10.2). */
const EXPECTED_TEMPLATE_ERRORS = 5

const load = async (xlsx: string, zip: string): Promise<ImportResult> => {
  const parsed = await readTemplateFiles([
    { filename: zip, data: readFileSync(`documents/${zip}`) },
  ])
  const templates: UploadedTemplate[] = parsed.map((template) => ({
    filename: template.filename,
    markdown: template.markdown,
  }))

  return importWorkbook(readWorkbook(readFileSync(`documents/${xlsx}`)), templates)
}

describe('fixture-platny.xlsx', () => {
  let result: ImportResult

  beforeAll(async () => {
    result = await load('fixture-platny.xlsx', 'sablony-platne-vzor.zip')
  })

  it('is usable — no errors', () => {
    expect(
      result.errors.map((e) => `${e.code} ${e.location.sheet}${e.location.cell ?? ''}`),
    ).toEqual([])
    expect(result.usable).toBe(true)
  })

  it('warns exactly once about the name written instead of a registry ID', () => {
    const warnings = result.warnings.filter((issue) => issue.code === 'unknown_character')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatchObject({ severity: 'warning', suggestion: 'Antonin' })
  })

  it('counts the quiet repairs the author is entitled to', () => {
    // Every number here is a habit of the author's that must not block the
    // import, and the report has to be able to say how often it happened.
    expect(result.config.repairs).toMatchObject({
      resolvedCharacterNames: 1,
      derivedQuestionIds: 19,
      derivedAnswerIds: 8,
      addedBoolAnswers: 4,
      semicolonSeparators: 1,
      trimmedCells: 4,
      skippedEmptyRows: 1,
    })
    expect(result.config.repairs.filledDownCells).toBeGreaterThan(0)
  })

  it('numbers each character`s questions from one, polls excluded', () => {
    const ids = (result.config.questions.get(1) ?? []).map((q) => q.externalId)
    expect(ids).toContain('Q_Marie_1_3')
    // The poll-answer on Antonín's third row takes ordinal 3, so the question
    // after it is his fourth (§6.6).
    expect(ids).toContain('Q_Antonin_1_4')
    const poll = (result.config.questions.get(1) ?? []).find((q) => q.type === 'poll')
    expect(poll?.ordinal).toBeUndefined()
  })

  it('reads per-character scale bounds, not one range for everybody', () => {
    const activity = result.config.scales.find((s) => s.externalId === 'S_Antonin_Activity')
    expect(activity).toMatchObject({ min: 1, max: 8 })
  })

  it('keeps diacritics intact through the export', () => {
    expect(result.config.characters.map((c) => c.firstName)).toContain('Antonín')
  })

  it('parses every condition in the sheet without a syntax error', () => {
    expect(result.issues.filter((i) => i.code === 'invalid_expression')).toEqual([])
  })

  it('ties five questions to a variant and keeps their marker-less blocks out of the orphans', () => {
    const conditions = [...result.config.questions.values()].flat().flatMap((q) => (q.condition ? [q.condition.raw] : []))
    expect(conditions).toEqual([
      'V_Marie_1_Questions_1_A',
      'V_Marie_1_Questions_2_A',
      'V_Marie_1_Questions_3_A',
      'V_Antonin_1_Questions_1_A',
      'V_Antonin_2_Questions_1_A',
    ])
    expect(result.issues.filter((i) => i.code === 'block_without_marker')).toEqual([])
  })
})

describe('fixture-vadny.xlsx', () => {
  let result: ImportResult

  beforeAll(async () => {
    result = await load('fixture-vadny.xlsx', 'sablony-vadne.zip')
  })

  it('is refused', () => {
    expect(result.usable).toBe(false)
  })

  it('reports every mistake in one pass, not just the first', () => {
    expect(result.errors).toHaveLength(EXPECTED_WORKBOOK_ERRORS + EXPECTED_TEMPLATE_ERRORS)
  })

  it('points every message at a place the author can find', () => {
    for (const issue of result.errors) {
      expect(issue.location.sheet).not.toBe('')
    }
  })

  it('finds each kind of mistake the fixture was built to carry', () => {
    const codes = new Set(result.errors.map((issue) => issue.code))
    for (const code of [
      'duplicate_id',
      'value_out_of_range',
      'unknown_character',
      'unknown_scale',
      'unknown_resource',
      'unknown_answer',
      'unknown_poll',
      'household_order',
      'answer_without_question',
      'question_without_answers',
      'invalid_impact',
      'invalid_expression',
      'question_condition_not_variation',
      'unknown_variation',
      'foreign_variation',
      'block_without_default',
      'duplicate_priority',
      'missing_priority',
      'unreachable_variant',
      'block_cycle',
      'marker_without_block',
      'block_without_marker',
      'invalid_template_marker',
      'invalid_template_filename',
      'owner_without_template',
    ]) {
      expect(codes).toContain(code)
    }
  })

  it('refuses all three kinds of a faulty question Condition and leaves the valid ones alone', () => {
    const found = result.errors
      .filter((e) => e.location.column === 'Condition')
      .map((e) => `${e.location.sheet}:${e.location.row} ${e.code}`)

    expect(found).toEqual([
      '2_Questions:3 unknown_variation',
      '2_Questions:7 question_condition_not_variation',
      '2_Questions:9 question_condition_not_variation',
      '2_Questions:10 foreign_variation',
      '2_Questions:14 question_condition_not_variation',
      '2_Questions:16 question_condition_not_variation',
    ])
  })

  it('reports the one true orphan, not the blocks that only decide a question', () => {
    expect(result.errors.filter((e) => e.code === 'block_without_marker').map((e) => e.value)).toEqual([
      'B_Mirek_1_Sirotek_1',
    ])
  })

  it('suggests the scale the author meant', () => {
    const issue = result.errors.find((e) => e.value === 'S_Marie_Regme')
    expect(issue?.suggestion).toBe('S_Marie_Regime')
  })

  it('says a household ID is simply the wrong way round', () => {
    const issue = result.errors.find((e) => e.code === 'household_order')
    expect(issue).toMatchObject({ value: 'MirekMarie', suggestion: 'MarieMirek' })
  })

  it('catches the answer row left behind a blank row', () => {
    const issue = result.errors.find((e) => e.code === 'answer_without_question')
    expect(issue?.value).toBe('A_Sirotek_1_1_X')
  })
})
