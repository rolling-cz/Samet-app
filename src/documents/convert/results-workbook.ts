/**
 * `vysledky.xlsx` in the chapter zip (§10.4): the Přehled tab as a workbook,
 * one row per value, so the org can filter and sort it without the app.
 *
 * Built from the overview rather than the state, so the file and the screen
 * say exactly the same thing.
 */
import * as XLSX from 'xlsx'
import { vystupy } from '@/locales/cs/vystupy'
import { OWNER_FILE_PREFIX } from '../constants/output-names'
import type { OutputOverview, OverviewEntry } from '../types/overview'

export const RESULTS_SHEETS = Object.freeze({ scales: 'Skaly', resources: 'Zdroje', variants: 'Varianty' } as const)


const scaleRows = (entries: OverviewEntry[]) =>
  entries.flatMap((entry) =>
    entry.scales.map((scale) => ({
      Postava: entry.owner.id,
      Jméno: entry.ownerLabel,
      Škála: scale.key,
      Popis: scale.label,
      Hodnota: scale.value,
      Min: scale.min,
      Max: scale.max,
    })),
  )

const resourceRows = (entries: OverviewEntry[]) =>
  entries.flatMap((entry) => [
    ...entry.resources.map((resource) => ({
      Postava: entry.owner.id,
      Jméno: entry.ownerLabel,
      Účet: vystupy.results.personalAccount,
      Zdroj: resource.key,
      Popis: resource.label,
      Hodnota: resource.value,
    })),
    ...(entry.household?.resources ?? []).map((resource) => ({
      Postava: entry.owner.id,
      Jméno: entry.ownerLabel,
      Účet: vystupy.results.jointAccount(entry.household?.householdId ?? '', entry.household?.partnerLabels ?? []),
      Zdroj: resource.key,
      Popis: resource.label,
      Hodnota: resource.value,
    })),
  ])

const variantRows = (entries: OverviewEntry[]) =>
  entries.flatMap((entry) =>
    entry.variants.map((variant) => ({
      Vlastník: OWNER_FILE_PREFIX[entry.owner.kind],
      ID: entry.owner.id,
      Jméno: entry.ownerLabel,
      Blok: variant.blockId,
      Varianta: variant.variationId ?? '',
    })),
  )

export const resultsWorkbook = (overview: OutputOverview): Buffer => {
  const workbook = XLSX.utils.book_new()
  const everyone = [...overview.characters, ...overview.groups]

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(scaleRows(overview.characters)), RESULTS_SHEETS.scales)
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(resourceRows(overview.characters)), RESULTS_SHEETS.resources)
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(variantRows(everyone)), RESULTS_SHEETS.variants)

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
