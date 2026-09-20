/** Addresses from before the chapter moved into the path (`/beh/<runId>/postavy`): no dead links. */
import { notFound, redirect } from 'next/navigation'
import { chapterRoute, defaultChapterNumber, isChapterSection } from '@/core'
import { loadRunShell } from '@/core/services/load-run-shell'

interface ChapterlessSectionPageProps {
  params: Promise<{ runId: string; section: string }>
}

const ChapterlessSectionPage = async ({ params }: ChapterlessSectionPageProps) => {
  const { runId, section } = await params
  const shell = await loadRunShell(runId)
  if (!shell || !isChapterSection(section)) notFound()

  redirect(chapterRoute(shell.run.id, defaultChapterNumber(shell.chapters), section))
}

export default ChapterlessSectionPage
