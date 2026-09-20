import { ChapterBlocked, SectionPlaceholder } from '@/components'
import { loadChapterPage } from '@/core/services/load-chapter-page'

interface SkupinyPageProps {
  params: Promise<{ runId: string; chapter: string }>
}

const SkupinyPage = async ({ params }: SkupinyPageProps) => {
  const { runId, chapter: chapterSegment } = await params
  const { chapter, availability } = await loadChapterPage(runId, chapterSegment)

  if (availability._type === 'blocked') {
    return <ChapterBlocked chapter={chapter} missingChapter={availability.missingChapter} />
  }

  return <SectionPlaceholder section="skupiny" chapter={chapter} />
}

export default SkupinyPage
