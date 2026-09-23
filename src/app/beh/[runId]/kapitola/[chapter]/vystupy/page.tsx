import { ChapterBlocked } from '@/components'
import { chapterHasSection, lastChapterNumber, OUTPUTS_SECTION, outputsDocumentChapter } from '@/core'
import { loadChapterPage } from '@/core/services/load-chapter-page'
import { loadRunShell } from '@/core/services/load-run-shell'
import { generateDocuments } from '@/documents'
import {
  OutputsScreen,
  OutputsUnavailable,
  outputsView,
  parseOutputTab,
  TAB_PARAM,
  unavailableText,
} from '@/features/vystupy'
import { vystupy } from '@/locales/cs/vystupy'

/** Refreshing templates from Google runs as a server action posting to this route. */
export const maxDuration = 60

interface VystupyPageProps {
  params: Promise<{ runId: string; chapter: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Výstupy of chapter N: the documents for chapter N+1, from the state after N (§8.3). */
const VystupyPage = async ({ params, searchParams }: VystupyPageProps) => {
  const [{ runId, chapter: chapterSegment }, query] = await Promise.all([params, searchParams])
  const page = await loadChapterPage(runId, chapterSegment)
  const { chapter, availability } = page

  if (availability._type === 'blocked') {
    return <ChapterBlocked runId={page.runId} chapter={chapter} missingChapter={availability.missingChapter} />
  }

  const shell = await loadRunShell(page.runId)
  if (!chapterHasSection(OUTPUTS_SECTION, chapter, lastChapterNumber(shell?.chapters ?? []))) {
    return (
      <OutputsUnavailable
        runId={page.runId}
        title={vystupy.lastChapterTitle}
        reason={vystupy.lastChapter(chapter)}
        fix={{ _type: 'none' }}
      />
    )
  }

  const set = await generateDocuments(page.runId, outputsDocumentChapter(chapter))
  if (set._type !== 'ready') {
    return (
      <OutputsUnavailable
        runId={page.runId}
        reason={unavailableText(set)}
        fix={set._type === 'blocked' ? { _type: 'recompute', chapter: set.missingChapter } : { _type: 'config' }}
      />
    )
  }

  return <OutputsScreen view={outputsView(page.runId, chapter, set)} tab={parseOutputTab(query[TAB_PARAM])} />
}

export default VystupyPage
