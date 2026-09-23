import { describe, expect, it } from 'vitest'
import { parseMarkdown } from './parse-markdown'

const text = (markdown: string) =>
  parseMarkdown(markdown)
    .flatMap((block) => ('content' in block ? block.content : 'items' in block ? block.items.flat() : []))
    .map((part) => part.text)
    .join('')

describe('parseMarkdown', () => {
  it('rozezná nadpisy tří úrovní', () => {
    expect(parseMarkdown('# A\n\n## B\n\n### C\n')).toEqual([
      { kind: 'heading', level: 1, content: [{ emphasis: 'none', text: 'A' }] },
      { kind: 'heading', level: 2, content: [{ emphasis: 'none', text: 'B' }] },
      { kind: 'heading', level: 3, content: [{ emphasis: 'none', text: 'C' }] },
    ])
  })

  it('hlubší nadpis spadne na nejmenší úroveň, místo aby zmizel', () => {
    const [block] = parseMarkdown('##### Hluboko\n')

    expect(block).toMatchObject({ kind: 'heading', level: 3 })
  })

  it('nese tučné a kurzívu včetně kombinace', () => {
    const [block] = parseMarkdown('**DOPAD:** běžný *text* a ***obojí***\n')

    expect(block).toMatchObject({
      kind: 'paragraph',
      content: [
        { emphasis: 'bold', text: 'DOPAD:' },
        { emphasis: 'none', text: ' běžný ' },
        { emphasis: 'italic', text: 'text' },
        { emphasis: 'none', text: ' a ' },
        { emphasis: 'boldItalic', text: 'obojí' },
      ],
    })
  })

  it('odrážkový seznam', () => {
    const [block] = parseMarkdown('- první\n- druhý\n')

    expect(block).toMatchObject({ kind: 'list', marker: 'bullet' })
  })

  it('číslovaný seznam se vykreslí písmeny, jak je v předloze', () => {
    const [block] = parseMarkdown('1. Laco\n2. Zdenko\n')

    expect(block).toMatchObject({ kind: 'list', marker: 'letter', items: [[{ emphasis: 'none', text: 'Laco' }], [{ emphasis: 'none', text: 'Zdenko' }]] })
  })

  it('ručně psaný seznam a) b) pozná taky', () => {
    const [block] = parseMarkdown('- a) Laco\n- b) Zdenko\n')

    expect(block).toMatchObject({ kind: 'list', marker: 'letter' })
  })

  it('vodorovná linka', () => {
    expect(parseMarkdown('---\n')).toEqual([{ kind: 'rule' }])
  })

  it('HTML komentář ze šablony do dokumentu nejde', () => {
    expect(parseMarkdown('<!-- fixture: Marie_2.md -->\n\nText.\n')).toEqual([
      { kind: 'paragraph', content: [{ emphasis: 'none', text: 'Text.' }] },
    ])
  })

  it('z odkazu zůstane text, URL se zahodí — papír nejde kliknout', () => {
    expect(text('Viz [stránka](https://example.com) dole.\n')).toBe('Viz stránka dole.')
  })

  it('escapované znaky a entity se vrátí jako znaky', () => {
    expect(text('100 \\* 2 & víc <než> "tohle"\n')).toBe('100 * 2 & víc <než> "tohle"')
  })

  it('diakritika projde beze změny', () => {
    expect(text('Příliš žluťoučký kůň úpěl ďábelské ódy.\n')).toBe('Příliš žluťoučký kůň úpěl ďábelské ódy.')
  })

  it('citace se neztratí, jen přijde o rámeček', () => {
    expect(text('> Poznámka orga\n')).toBe('Poznámka orga')
  })

  it('prázdný vstup nedá nic', () => {
    expect(parseMarkdown('')).toEqual([])
  })
})
