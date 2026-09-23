/**
 * Turning a template into the finished document (§8.3, step [2]).
 *
 * The template carries only markers; the text lives in `N_Content` (§8.2), so
 * filling is substitution, never re-evaluation — the engine already decided
 * which variant won. A variant's text may contain another `{BLOK …}`, so this
 * runs in a loop (§8.4).
 *
 * Nothing is repaired here. A marker with no variant, an unknown variable and a
 * marker that survives are all reported; the caller refuses to print a PDF over
 * a document that has problems.
 */
// The module, not the `@/import` barrel: that one re-exports `persist/`, which
// opens a database connection and would drag one into a pure function.
import { parseTemplate, replaceMarkers, type TemplateMarker } from '@/import/template'
import { MAX_FILL_PASSES } from '../constants/fill-limits'
import type { FillProblem, FillProblemCode, FilledDocument } from '../types/document'
import { tidyBlankLines } from './tidy-blank-lines'

export interface FillInput {
  markdown: string
  /** Text of the chosen variant per Block ID; an undecided block is absent. */
  blockTexts: ReadonlyMap<string, string>
  variables: Readonly<Record<string, string>>
}

export const fillTemplate = ({ markdown, blockTexts, variables }: FillInput): FilledDocument => {
  const problems: FillProblem[] = []
  const reported = new Set<string>()

  const report = (code: FillProblemCode, raw: string, detail: string, line?: number): void => {
    const key = `${code}|${raw}|${detail}`
    if (reported.has(key)) return
    reported.add(key)
    problems.push({ code, line, raw, detail })
  }

  /** Markers we already explained; they must not be reported again as survivors. */
  const unresolved = new Set<string>()

  const resolve = (marker: TemplateMarker): string | undefined => {
    if (marker.kind === 'block') {
      const text = blockTexts.get(marker.name)
      if (text !== undefined) return text

      unresolved.add(marker.raw)
      report(
        'unknown_block',
        marker.raw,
        `blok \`${marker.name}\` nemá vybranou variantu — buď k němu chybí hod kostkou, nebo nepatří téhle postavě a kapitole`,
        marker.line,
      )

      return undefined
    }

    const value = variables[marker.name]
    if (value !== undefined) return value

    unresolved.add(marker.raw)
    report('unknown_variable', marker.raw, `proměnnou \`{${marker.name}}\` aplikace neumí naplnit`, marker.line)

    return undefined
  }

  let text = markdown
  let passes = 0

  for (;;) {
    const parsed = parseTemplate(text)
    for (const problem of parsed.problems) report('marker_syntax', problem.raw, problem.detail, problem.line)
    if (parsed.markers.length === 0) break

    if (passes >= MAX_FILL_PASSES) {
      report(
        'too_many_passes',
        parsed.markers[0]?.raw ?? '',
        `nahrazování bloků se po ${MAX_FILL_PASSES} průchodech nezastavilo — bloky se nejspíš odkazují dokola`,
      )
      break
    }

    const next = replaceMarkers(text, resolve)
    passes += 1
    // Only markers nothing can resolve are left, so another pass changes nothing.
    if (next === text) break
    text = next
  }

  for (const marker of parseTemplate(text).markers) {
    if (unresolved.has(marker.raw)) continue
    report('marker_survived', marker.raw, `značka \`${marker.raw}\` zůstala v hotovém dokumentu`, marker.line)
  }

  return { markdown: tidyBlankLines(text), problems, passes }
}
