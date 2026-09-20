import { isDeepStrictEqual } from 'node:util'
import { and, eq, gt, inArray, notInArray } from 'drizzle-orm'
import {
  ANSWER_AUDIT_ACTIONS,
  ANSWER_AUDIT_ENTITY,
  loadChapterCompletion,
  loadQuestionnaire,
  type QuestionView,
} from '@/computation'
import { touchChapters } from '@/core/services/touch-chapters'
import { forRun, type RunScope } from '@/db'
import {
  answerInputValues,
  answerOptions,
  answerSelectedOptions,
  answers,
  auditLog,
  chapters,
  characters,
  questions,
} from '@/db/schema'
import { audit } from '@/locales/cs/audit'
import { dotaznik } from '@/locales/cs/dotaznik'
import type { AnswerWrite } from '../types/answer-write'
import type { SaveAnswerRequest, SaveAnswerResult } from '../types/save-answer'
import type { StoredAnswerValue } from '../types/stored-answer-value'
import { storedValueOfAnswer, storedValueOfWrite } from '../utils/stored-answer-value'
import { toAnswerWrite } from '../utils/to-answer-write'

interface AnswerKeys {
  chapterId: string
  chapterStatus: (typeof chapters.$inferSelect)['status']
  characterId: string
  questionId: string
}

/**
 * Database keys of what the request names. The composite foreign keys would
 * refuse a question of another run; that the question is this character's and
 * this chapter's is checked here, not left to them.
 */
const answerKeysOf = async (scope: RunScope, request: SaveAnswerRequest): Promise<AnswerKeys | undefined> => {
  const [[chapter], [character], [question]] = await Promise.all([
    scope.selectColumns(chapters, { id: chapters.id, status: chapters.status }, eq(chapters.number, request.chapter)),
    scope.selectColumns(characters, { id: characters.id }, eq(characters.externalId, request.characterId)),
    scope.selectColumns(
      questions,
      { id: questions.id, chapterId: questions.chapterId, characterId: questions.characterId },
      eq(questions.externalId, request.questionId),
    ),
  ])
  if (!chapter || !character || !question) return undefined
  if (question.chapterId !== chapter.id || question.characterId !== character.id) return undefined

  return { chapterId: chapter.id, chapterStatus: chapter.status, characterId: character.id, questionId: question.id }
}

const optionKeysOf = async (scope: RunScope, write: AnswerWrite): Promise<Map<string, string>> => {
  const externalIds = new Set(write.selectedOptionIds)
  for (const input of write.inputValues) externalIds.add(input.optionId)
  if (externalIds.size === 0) return new Map()

  const rows = await scope.selectColumns(
    answerOptions,
    { id: answerOptions.id, externalId: answerOptions.externalId },
    inArray(answerOptions.externalId, [...externalIds]),
  )

  return new Map(rows.map((row) => [row.externalId, row.id]))
}

const optionKey = (optionKeys: ReadonlyMap<string, string>, externalId: string): string => {
  const id = optionKeys.get(externalId)
  if (id === undefined) throw new Error(`answer option ${externalId} has no row in the database`)

  return id
}

const removeAnswer = async (scope: RunScope, answerId: string): Promise<void> => {
  await scope.delete(answerInputValues, eq(answerInputValues.answerId, answerId))
  await scope.delete(answerSelectedOptions, eq(answerSelectedOptions.answerId, answerId))
  await scope.delete(answers, eq(answers.id, answerId))
}

const storeAnswer = async (
  scope: RunScope,
  keys: AnswerKeys,
  existingId: string | undefined,
  write: AnswerWrite,
  author: string,
): Promise<void> => {
  const values = {
    boolValue: write.boolValue,
    numericValue: write.numericValue,
    textValue: write.textValue,
    answeredBy: author,
    answeredAt: new Date(),
  }

  let answerId = existingId
  if (answerId === undefined) {
    const [created] = await scope
      .insert(answers, {
        chapterId: keys.chapterId,
        characterId: keys.characterId,
        questionId: keys.questionId,
        ...values,
      })
      .returning({ id: answers.id })
    if (!created) throw new Error('the answer was not stored')
    answerId = created.id
  } else {
    await scope.update(answers, eq(answers.id, answerId)).set(values)
  }

  const optionKeys = await optionKeysOf(scope, write)
  const selectedIds = write.selectedOptionIds.map((optionId) => optionKey(optionKeys, optionId))

  // Only what the answer no longer holds goes; the rest stays the row it was.
  await scope.delete(
    answerSelectedOptions,
    eq(answerSelectedOptions.answerId, answerId),
    selectedIds.length === 0 ? undefined : notInArray(answerSelectedOptions.answerOptionId, selectedIds),
  )
  if (selectedIds.length > 0) {
    await scope
      .insert(
        answerSelectedOptions,
        selectedIds.map((answerOptionId) => ({ answerId, answerOptionId })),
      )
      .onConflictDoNothing()
  }

  // `{input}` values are few; rewritten as a set, the audit holds what they were.
  await scope.delete(answerInputValues, eq(answerInputValues.answerId, answerId))
  if (write.inputValues.length > 0) {
    await scope.insert(
      answerInputValues,
      write.inputValues.map((input) => ({
        answerId,
        answerOptionId: optionKey(optionKeys, input.optionId),
        inputKey: input.inputKey,
        value: input.value,
      })),
    )
  }
}

const findQuestion = async (request: SaveAnswerRequest): Promise<QuestionView | SaveAnswerResult> => {
  const loaded = await loadQuestionnaire(request.runId, request.chapter, request.characterId)
  if (loaded._type === 'blocked') return { _type: 'failed', message: dotaznik.errorBlocked(loaded.missingChapter) }

  // Asked or not is the core's lookup; a question outside it is never stored.
  return (
    loaded.questionnaire.questions.find((question) => question.id === request.questionId) ?? {
      _type: 'failed',
      message: dotaznik.errorNotAsked(request.questionId),
    }
  )
}

const savedResult = async (request: SaveAnswerRequest): Promise<SaveAnswerResult> => {
  const [question, completion] = await Promise.all([
    findQuestion(request),
    loadChapterCompletion(request.runId, request.chapter),
  ])
  if ('_type' in question) return question
  if (completion._type === 'blocked') return { _type: 'failed', message: dotaznik.errorBlocked(completion.missingChapter) }

  return question.answer
    ? { _type: 'saved', answer: question.answer, completion: completion.characters }
    : { _type: 'saved', completion: completion.characters }
}

/**
 * Stores one question's answer, or removes it when the draft no longer is one
 * (§6.1). Every change lands in the audit with the value before and after; in
 * a released chapter it needs a reason and touches the chapters after it (§3.2).
 */
export const saveAnswer = async (request: SaveAnswerRequest, author: string): Promise<SaveAnswerResult> => {
  const question = await findQuestion(request)
  if ('_type' in question) return question

  const outcome = toAnswerWrite(question, request.draft)
  if (outcome._type === 'invalid') return { _type: 'failed', message: dotaznik.errorInvalid }

  const before: StoredAnswerValue | null = question.answer ? storedValueOfAnswer(question.answer) : null
  const after: StoredAnswerValue | null = outcome._type === 'write' ? storedValueOfWrite(outcome.write) : null
  if (isDeepStrictEqual(before, after)) return savedResult(request)

  const scope = forRun(request.runId)
  const keys = await answerKeysOf(scope, request)
  if (!keys) return { _type: 'failed', message: dotaznik.errorNotAsked(request.questionId) }

  const reason = request.reason?.trim() ?? ''
  const isReleased = keys.chapterStatus === 'released'
  if (isReleased && reason === '') return { _type: 'reason_required' }

  const touchedChapters = await scope.transaction(async (tx) => {
    const [existing] = await tx.selectColumns(
      answers,
      { id: answers.id },
      and(
        eq(answers.chapterId, keys.chapterId),
        eq(answers.characterId, keys.characterId),
        eq(answers.questionId, keys.questionId),
      ),
    )

    if (outcome._type === 'write') await storeAnswer(tx, keys, existing?.id, outcome.write, author)
    else if (existing) await removeAnswer(tx, existing.id)

    const touched = isReleased ? await touchChapters(tx, gt(chapters.number, request.chapter), reason) : []
    const summary = outcome._type === 'write' ? audit.answerChanged : audit.answerCancelled

    await tx.insert(auditLog, {
      chapterId: keys.chapterId,
      action: outcome._type === 'write' ? ANSWER_AUDIT_ACTIONS.change : ANSWER_AUDIT_ACTIONS.cancel,
      entityKind: ANSWER_AUDIT_ENTITY,
      entityId: request.questionId,
      summary: summary(request.questionId, request.characterId, request.chapter, touched),
      valueBefore: before,
      valueAfter: after,
      reason: reason === '' ? null : reason,
      author,
    })

    return touched
  })

  const result = await savedResult(request)

  return result._type === 'saved' ? { ...result, touchedChapters } : result
}
