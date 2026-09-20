import { ChapterBlocked, PageNote } from '@/components'
import { loadChapterPage } from '@/core/services/load-chapter-page'
import { postavy } from '@/locales/cs/postavy'

interface PostavyPageProps {
  params: Promise<{ runId: string; chapter: string }>
}

/** Nobody is selected on the org's behalf: the character is the one whose paper they hold. */
const PostavyPage = async ({ params }: PostavyPageProps) => {
  const { runId, chapter: chapterSegment } = await params
  const page = await loadChapterPage(runId, chapterSegment)
  const { chapter, availability } = page

  if (availability._type === 'blocked') {
    return <ChapterBlocked runId={page.runId} chapter={chapter} missingChapter={availability.missingChapter} />
  }

  return <PageNote title={postavy.pickTitle(chapter)} body={postavy.pickBody} testId="character-pick" />
}

export default PostavyPage
