import { describe, expect, it } from 'vitest'
import { parseTemplate } from './template'

describe('parseTemplate', () => {
  it('reads block markers and variables', () => {
    const { problems, blockIds, variables } = parseTemplate(
      '# {JMENO} {PRIJMENI}\n\n{BLOK B_Marie_2_Historie_1}\n\nStav: {S_Regime}, {R_Wealth}\n\n{BLOK B_Marie_2_Prace_1}\n',
    )
    expect(problems).toEqual([])
    expect(blockIds).toEqual(['B_Marie_2_Historie_1', 'B_Marie_2_Prace_1'])
    expect(variables).toEqual(['JMENO', 'PRIJMENI', 'S_Regime', 'R_Wealth'])
  })

  it('records the line of every marker', () => {
    const { markers } = parseTemplate('prvni\n{BLOK B_1}\n\n{JMENO}')
    expect(markers.map((m) => [m.name, m.line])).toEqual([
      ['B_1', 2],
      ['JMENO', 4],
    ])
  })

  it('reads two markers on one line', () => {
    const { markers } = parseTemplate('{JMENO} {PRIJMENI}')
    expect(markers).toHaveLength(2)
  })

  it('deduplicates a block used twice', () => {
    const { blockIds } = parseTemplate('{BLOK B_1}\n{BLOK B_1}')
    expect(blockIds).toEqual(['B_1'])
  })

  it('rejects the paired closing marker, which is no longer the format', () => {
    const { problems } = parseTemplate('{BLOK B_1}\ntext\n{/BLOK}')
    expect(problems).toHaveLength(1)
    expect(problems[0]!.detail).toContain('nepárové')
    expect(problems[0]!.line).toBe(3)
  })

  it('catches an unclosed marker', () => {
    const { problems } = parseTemplate('text {BLOK B_1\ndalsi')
    expect(problems[0]!.detail).toContain('chybí `}`')
  })

  it('catches a stray closing brace', () => {
    const { problems } = parseTemplate('text } dalsi')
    expect(problems[0]!.detail).toContain('bez odpovídající')
  })

  it('catches an empty marker', () => {
    const { problems } = parseTemplate('text {} dalsi')
    expect(problems[0]!.detail).toContain('prázdná')
  })

  it('catches {BLOK} without an ID', () => {
    const { problems } = parseTemplate('{BLOK}')
    expect(problems[0]!.detail).toContain('bez ID')
  })

  it('catches a block ID containing a space', () => {
    const { problems } = parseTemplate('{BLOK B_1 navic}')
    expect(problems[0]!.detail).toContain('mezeru')
  })

  it('treats an unknown braced word as a variable rather than failing', () => {
    const { markers } = parseTemplate('{SKUPINA}')
    expect(markers[0]!).toMatchObject({ kind: 'promenna', name: 'SKUPINA' })
  })

  it('survives diacritics in block IDs', () => {
    const { blockIds } = parseTemplate('{BLOK B_Věra_2_Historie_1}')
    expect(blockIds).toEqual(['B_Věra_2_Historie_1'])
  })

  it('a template with no markers is fine', () => {
    expect(parseTemplate('jen pevny text').markers).toEqual([])
  })
})
