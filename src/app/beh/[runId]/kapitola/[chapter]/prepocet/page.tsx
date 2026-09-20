import { ChapterBlocked } from '@/components'
import { loadChapterPage } from '@/core/services/load-chapter-page'
import { RecomputePanel } from '@/features/prepocet'

interface PrepocetPageProps {
  params: Promise<{ runId: string; chapter: string }>
}

const PrepocetPage = async ({ params }: PrepocetPageProps) => {
  const { runId, chapter: chapterSegment } = await params
  const page = await loadChapterPage(runId, chapterSegment)
  const { chapter, availability } = page

  if (availability._type === 'blocked') {
    return <ChapterBlocked runId={page.runId} chapter={chapter} missingChapter={availability.missingChapter} />
  }

  return <RecomputePanel runId={page.runId} chapter={chapter} />
}

export default PrepocetPage
