import { notFound } from 'next/navigation'
import { ChapterBlocked, PageNote } from '@/components'
import { decodeSegment } from '@/core'
import { loadChapterPage } from '@/core/services/load-chapter-page'
import { findCharacter } from '@/features/postavy'
import { postavy } from '@/locales/cs/postavy'

interface CharacterPageProps {
  params: Promise<{ runId: string; chapter: string; characterId: string }>
}

const CharacterPage = async ({ params }: CharacterPageProps) => {
  const { runId, chapter: chapterSegment, characterId } = await params
  const { chapter, availability } = await loadChapterPage(runId, chapterSegment)

  // An unknown character is a wrong address even in a chapter that cannot open yet.
  const character = await findCharacter(runId, decodeSegment(characterId))
  if (!character) notFound()

  if (availability._type === 'blocked') {
    return <ChapterBlocked chapter={chapter} missingChapter={availability.missingChapter} />
  }

  return (
    <PageNote
      title={postavy.characterTitle(postavy.fullName(character.firstName, character.lastName), chapter)}
      body={postavy.characterBody}
      testId={`character-screen--${character.externalId}`}
    />
  )
}

export default CharacterPage
