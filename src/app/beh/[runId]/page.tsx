import { notFound, redirect } from 'next/navigation'
import { chapterRoute, DEFAULT_CHAPTER_SECTION, defaultChapterNumber } from '@/core'
import { loadRunShell } from '@/core/services/load-run-shell'

const RunPage = async ({ params }: { params: Promise<{ runId: string }> }) => {
  const shell = await loadRunShell((await params).runId)
  if (!shell) notFound()

  redirect(chapterRoute(shell.run.id, defaultChapterNumber(shell.chapters), DEFAULT_CHAPTER_SECTION))
}

export default RunPage
