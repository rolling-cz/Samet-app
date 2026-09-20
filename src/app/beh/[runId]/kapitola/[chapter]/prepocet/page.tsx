import { ChapterBlocked, SectionPlaceholder } from '@/components'
import { loadChapterPage } from '@/core/services/load-chapter-page'

interface PrepocetPageProps {
  params: Promise<{ runId: string; chapter: string }>
}

const PrepocetPage = async ({ params }: PrepocetPageProps) => {
  const { runId, chapter: chapterSegment } = await params
  const { chapter, availability } = await loadChapterPage(runId, chapterSegment)

  if (availability._type === 'blocked') {
    return <ChapterBlocked chapter={chapter} missingChapter={availability.missingChapter} />
  }

  return <SectionPlaceholder section="prepocet" chapter={chapter} />
}

export default PrepocetPage
