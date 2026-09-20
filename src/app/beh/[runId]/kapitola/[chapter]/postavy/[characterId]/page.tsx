import { notFound } from 'next/navigation'
import { ChapterBlocked } from '@/components'
import { loadChapterCompletion, loadChapterStaleness, loadQuestionnaire } from '@/computation'
import { decodeSegment } from '@/core'
import { loadChapterPage } from '@/core/services/load-chapter-page'
import { loadRunShell } from '@/core/services/load-run-shell'
import { Questionnaire } from '@/features/dotaznik'
import { findCharacter, loadCharacterList } from '@/features/postavy'

interface CharacterPageProps {
  params: Promise<{ runId: string; chapter: string; characterId: string }>
}

const CharacterPage = async ({ params }: CharacterPageProps) => {
  const { runId, chapter: chapterSegment, characterId } = await params
  const page = await loadChapterPage(runId, chapterSegment)
  const { chapter, availability } = page

  // An unknown character is a wrong address even in a chapter that cannot open yet.
  const character = await findCharacter(page.runId, decodeSegment(characterId))
  if (!character) notFound()

  if (availability._type === 'blocked') {
    return <ChapterBlocked runId={page.runId} chapter={chapter} missingChapter={availability.missingChapter} />
  }

  // Read again on every visit: a colleague may have entered something meanwhile (§6.4).
  const [loaded, completion, staleness, characters, shell] = await Promise.all([
    loadQuestionnaire(page.runId, chapter, character.externalId),
    loadChapterCompletion(page.runId, chapter),
    loadChapterStaleness(page.runId, chapter),
    loadCharacterList(page.runId),
    loadRunShell(page.runId),
  ])
  if (loaded._type === 'blocked') {
    return <ChapterBlocked runId={page.runId} chapter={chapter} missingChapter={loaded.missingChapter} />
  }
  if (completion._type === 'blocked') {
    return <ChapterBlocked runId={page.runId} chapter={chapter} missingChapter={completion.missingChapter} />
  }

  const chapterStatus = shell?.chapters.find((row) => row.number === chapter)?.status

  return (
    <Questionnaire
      // Every question owns its draft from mount, so another character must be another instance.
      key={`${chapter}/${character.externalId}`}
      runId={page.runId}
      chapter={chapter}
      questionnaire={loaded.questionnaire}
      completion={completion.characters}
      characterOrder={characters.map((row) => row.externalId)}
      isReleased={chapterStatus === 'released'}
      isStale={staleness._type === 'stale'}
    />
  )
}

export default CharacterPage
