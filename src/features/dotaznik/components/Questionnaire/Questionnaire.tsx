'use client'

import Typography from '@mui/material/Typography'
import { useEffect, useMemo } from 'react'
import type { CharacterCompletion, QuestionnaireView } from '@/computation'
import { useChapterCompletion } from '@/core/hooks/useChapterCompletion'
import { useReportCompletion } from '@/core/hooks/useReportCompletion'
import { common } from '@/locales/cs/common'
import { dotaznik } from '@/locales/cs/dotaznik'
import { useReleasedReason } from '../../hooks/useReleasedReason'
import { useUnsavedQuestions } from '../../hooks/useUnsavedQuestions'
import type { QuestionnaireContext } from '../../types/questionnaire-context'
import { characterNeighbours } from '../../utils/character-neighbours'
import { ChapterNotices } from './components/ChapterNotices/ChapterNotices'
import { CharacterNav } from './components/CharacterNav/CharacterNav'
import { CharacterStatePanel } from './components/CharacterStatePanel/CharacterStatePanel'
import { QuestionCard } from './components/QuestionCard/QuestionCard'
import { ReleasedEditDialog } from './components/ReleasedEditDialog/ReleasedEditDialog'
import styles from './Questionnaire.module.css'

interface QuestionnaireProps {
  runId: string
  chapter: number
  questionnaire: QuestionnaireView
  /** Loaded with the page, so the panel also learns what colleagues entered since the layout loaded. */
  completion: readonly CharacterCompletion[]
  /** Registry IDs in the panel's order. */
  characterOrder: readonly string[]
  isReleased: boolean
  isStale: boolean
}

/**
 * One character's questionnaire (§6.4): the paper the org holds. Key it by
 * character and chapter — every question owns its draft from the moment it mounts.
 */
export const Questionnaire = ({
  runId,
  chapter,
  questionnaire,
  completion,
  characterOrder,
  isReleased,
  isStale,
}: QuestionnaireProps) => {
  const { character, questions, state, partners } = questionnaire

  const reportCompletion = useReportCompletion()
  const { byCharacter } = useChapterCompletion(chapter)
  const { requestReason, reason, isAsking, handleConfirm, handleDismiss } = useReleasedReason(isReleased)
  const handleUnsavedChange = useUnsavedQuestions()

  const context = useMemo<QuestionnaireContext>(
    () => ({ runId, chapter, characterId: character.id, requestReason, onUnsavedChange: handleUnsavedChange }),
    [runId, chapter, character.id, requestReason, handleUnsavedChange],
  )

  const neighbours = useMemo(
    () => characterNeighbours(characterOrder, character.id, (characterId) => byCharacter.get(characterId)?.status),
    [characterOrder, character.id, byCharacter],
  )

  const firstUnansweredId = useMemo(() => questions.find((question) => !question.answer)?.id, [questions])

  useEffect(() => {
    reportCompletion(chapter, completion)
  }, [reportCompletion, chapter, completion])

  return (
    <div className={styles.screen} data-testid={`questionnaire--${character.id}`}>
      <header className={styles.head}>
        <Typography variant="h5" component="h1" className={styles.title}>
          {dotaznik.title(common.fullName(character.firstName, character.lastName), chapter)}
        </Typography>
        <CharacterNav runId={runId} chapter={chapter} neighbours={neighbours} />
      </header>

      <ChapterNotices isReleased={isReleased} isStale={isStale} reason={reason} />

      {questions.length === 0 ? (
        <Typography variant="body2" className={styles.empty} data-testid="questionnaire--no-questions">
          {dotaznik.noQuestions}
        </Typography>
      ) : (
        <div className={styles.questions}>
          {questions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              context={context}
              hasInitialFocus={question.id === firstUnansweredId}
            />
          ))}
        </div>
      )}

      <CharacterStatePanel runId={runId} chapter={chapter} state={state} partners={partners} />

      {isAsking && (
        <ReleasedEditDialog runId={runId} chapter={chapter} onConfirm={handleConfirm} onDismiss={handleDismiss} />
      )}
    </div>
  )
}
