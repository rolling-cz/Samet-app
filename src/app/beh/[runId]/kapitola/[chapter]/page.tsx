import { redirect } from 'next/navigation'
import { chapterRoute, DEFAULT_CHAPTER_SECTION } from '@/core'
import { loadChapterPage } from '@/core/services/load-chapter-page'

interface ChapterPageProps {
  params: Promise<{ runId: string; chapter: string }>
}

const ChapterPage = async ({ params }: ChapterPageProps) => {
  const { runId, chapter } = await params
  const page = await loadChapterPage(runId, chapter)

  redirect(chapterRoute(page.runId, page.chapter, DEFAULT_CHAPTER_SECTION))
}

export default ChapterPage
