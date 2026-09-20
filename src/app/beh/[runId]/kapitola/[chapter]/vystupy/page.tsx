import { ChapterBlocked, SectionPlaceholder } from '@/components'
import { loadChapterPage } from '@/core/services/load-chapter-page'

interface VystupyPageProps {
  params: Promise<{ runId: string; chapter: string }>
}

const VystupyPage = async ({ params }: VystupyPageProps) => {
  const { runId, chapter: chapterSegment } = await params
  const { chapter, availability } = await loadChapterPage(runId, chapterSegment)

  if (availability._type === 'blocked') {
    return <ChapterBlocked chapter={chapter} missingChapter={availability.missingChapter} />
  }

  return <SectionPlaceholder section="vystupy" chapter={chapter} />
}

export default VystupyPage
