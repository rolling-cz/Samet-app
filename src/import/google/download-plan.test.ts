import { describe, expect, it } from 'vitest'
import { TEMPLATE_SOURCE_COLUMNS, TEMPLATES_SHEET } from '../constants/sheets'
import { importWorkbook } from '../import-config'
import { buildWorkbook } from '../testing/build-workbook'
import { readTemplateFiles } from '../template-upload'
import { buildDownloadZip, downloadReport, downloadZipName, planDownloads, type DownloadedFile } from './download-plan'

const ID = (suffix: string) => `1AbCdEfGhIjKlMnOpQrStUvWxYz_${suffix}`

const configWith = (...rows: [string, string, string][]) =>
  importWorkbook(buildWorkbook({ extra: { [TEMPLATES_SHEET]: [[...TEMPLATE_SOURCE_COLUMNS], ...rows] } })).config

describe('planDownloads', () => {
  it('název souboru z mapování, URL z ověřeného ID', () => {
    const { jobs, skippedRows } = planDownloads(
      configWith(
        ['Marie', '2', `https://docs.google.com/document/d/${ID('m')}/edit?tab=t.7&x=<script>`],
        ['Srdce party', '2', `https://docs.google.com/document/d/${ID('s')}/edit?tab=t.0`],
      ),
    )

    expect(skippedRows).toBe(0)
    expect(jobs).toEqual([
      {
        ownerKind: 'character',
        ownerId: 'Marie',
        ownerLabel: 'Marie Balážová',
        chapter: 2,
        fileName: 'Marie_2.md',
        exportUrl: `https://docs.google.com/document/d/${ID('m')}/export?format=md&tab=t.7`,
        editUrl: `https://docs.google.com/document/d/${ID('m')}/edit?tab=t.7`,
      },
      expect.objectContaining({ ownerKind: 'group', ownerId: 'SrdceParty', fileName: 'SrdceParty_2.md' }),
    ])
  })

  it('vadné řádky přeskočí a spočítá', () => {
    const { jobs, skippedRows } = planDownloads(
      configWith(
        ['Marie', '2', 'https://example.com/x'],
        ['Nikdo', '2', `https://docs.google.com/document/d/${ID('n')}/edit`],
        ['Mirek', '9', `https://docs.google.com/document/d/${ID('k')}/edit`],
        ['Mirek', '2', `https://docs.google.com/document/d/${ID('a')}/edit`],
        ['Mirek', '2', `https://docs.google.com/document/d/${ID('b')}/edit`],
      ),
    )

    expect(jobs.map((job) => job.exportUrl)).toEqual([`https://docs.google.com/document/d/${ID('a')}/export?format=md`])
    expect(skippedRows).toBe(4)
  })

  it('bez listu nic', () => {
    expect(planDownloads(importWorkbook(buildWorkbook()).config)).toEqual({ jobs: [], skippedRows: 0 })
  })
})

describe('buildDownloadZip', () => {
  const item = (fileName: string, status: 'ok' | 'not_public') => ({
    ownerKind: 'character' as const,
    ownerId: fileName.split('_')[0] ?? '',
    ownerLabel: '',
    chapter: 2,
    fileName,
    editUrl: '',
    status,
  })

  it('zip projde stávajícím čtením šablon beze změny', async () => {
    const files: DownloadedFile[] = [
      { item: item('Marie_2.md', 'ok'), markdown: '# Marie Balážová' },
      { item: item('Mirek_2.md', 'not_public') },
    ]
    const report = downloadReport(files, 0, new Date('2026-09-23T10:15:02Z'))
    const templates = await readTemplateFiles([{ filename: 'x.zip', data: await buildDownloadZip(files, report) }])

    expect(report).toMatchObject({ okCount: 1, failedCount: 1 })
    // `_stazeni.json` is not markdown, so the template reader skips it.
    expect(templates.map((template) => [template.filename, template.ownerRef, template.chapter, template.markdown])).toEqual([
      ['Marie_2.md', 'Marie', 2, '# Marie Balážová'],
    ])
  })

  it('název zipu nese čas stažení', () => {
    expect(downloadZipName(new Date('2026-09-23T10:15:02.123Z'))).toBe('sablony-google_2026-09-23_10-15-02.zip')
  })
})
