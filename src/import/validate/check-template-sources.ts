import { TEMPLATES_SHEET } from '../constants/sheets'
import type { IssueCollector } from '../issue-collector'
import type { ParsedConfig } from '../types/parsed-config'
import { suggestClosest } from '../utils/suggest-closest'

/**
 * The `Templates` sheet against the registries (§10.2).
 *
 * An owner with no row is a warning, not an error: the `.md` upload stays the
 * fallback forever, and a missing link must not block a config whose templates
 * arrive the other way.
 */
export const checkTemplateSources = (config: ParsedConfig, issues: IssueCollector): void => {
  const sources = config.templateSources
  if (sources === undefined) return

  const knownOwners = [...config.characters.map((c) => c.externalId), ...config.groups.map((g) => g.externalId)]
  const seen = new Map<string, number | undefined>()
  const byDocument = new Map<string, string>()

  for (const source of sources) {
    if (source.owner === undefined) {
      issues.error(
        'unknown_character',
        source.location,
        `Šablona je vedená na \`${source.ownerRef}\`, což není postava z listu \`Characters\` ani skupina z listu \`Groups\`.`,
        { value: source.ownerRef, suggestion: suggestClosest(source.ownerRef, knownOwners) },
      )
      continue
    }

    if (!config.chapters.includes(source.chapter)) {
      issues.error(
        'value_out_of_range',
        source.location,
        `Kapitola ${source.chapter} v konfiguraci není (listy \`N_Questions\` / \`N_Content\` jsou pro ${config.chapters.join(', ')}).`,
        { value: String(source.chapter) },
      )
      continue
    }

    const pair = `${source.owner.id}_${source.chapter}`
    if (seen.has(pair)) {
      const first = seen.get(pair)
      issues.error(
        'duplicate_template_source',
        source.location,
        `\`${source.owner.id}\` má pro kapitolu ${source.chapter} dvě adresy${first === undefined ? '' : ` (poprvé na řádku ${first})`} — nevědělo by se, kterou stáhnout.`,
        { value: pair },
      )
      continue
    }
    seen.set(pair, source.location.row)

    if (source.ref === undefined) continue
    // Two owners pointing at one tab is nearly always a row copied and not edited.
    const document = `${source.ref.documentId}#${source.ref.tabId ?? ''}`
    const other = byDocument.get(document)
    if (other !== undefined) {
      issues.warn(
        'shared_template_url',
        source.location,
        `\`${pair}\` míří na stejný dokument i kartu jako \`${other}\` — nezůstal tu zkopírovaný řádek?`,
        { value: source.url },
      )
    } else {
      byDocument.set(document, pair)
    }
  }

  for (const owner of knownOwners) {
    for (const chapter of config.chapters) {
      if (seen.has(`${owner}_${chapter}`)) continue
      issues.warn(
        'owner_without_template_url',
        { sheet: TEMPLATES_SHEET },
        `\`${owner}\` nemá pro kapitolu ${chapter} adresu šablony — z Googlu se nenačte, šablonu je potřeba nahrát jako \`.md\`.`,
        { value: `${owner}_${chapter}` },
      )
    }
  }
}
