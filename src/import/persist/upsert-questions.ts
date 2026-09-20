import type { RunScope } from '@/db'
import { answerOptions, questions } from '@/db/schema'
import type { ParsedConfig } from '../types/parsed-config'
import type { ParsedQuestion } from '../types/parsed-question'
import type { EntityIds, IdMap } from './entity-ids'
import { writeAnswerEffects } from './write-answer-effects'
import type { WrittenRows } from './written-rows'

export const upsertQuestions = async (
  scope: RunScope,
  config: ParsedConfig,
  written: WrittenRows,
  refs: EntityIds,
): Promise<void> => {
  // Polls first: a vote carries a foreign key to its poll, and the two may sit
  // in any order in the sheet (§6.6).
  await writeQuestions(scope, config, written, refs, (q) => q.type === 'poll')
  await writeQuestions(scope, config, written, refs, (q) => q.type !== 'poll')

  const optionIds = await upsertAnswerOptions(scope, config, written, refs)

  await writeAnswerEffects(scope, config, written, refs, optionIds)
}

const writeQuestions = async (
  scope: RunScope,
  config: ParsedConfig,
  written: WrittenRows,
  refs: EntityIds,
  accept: (question: ParsedQuestion) => boolean,
): Promise<void> => {
  for (const [chapter, list] of config.questions) {
    const chapterId = refs.chapterIds.get(chapter)
    if (!chapterId) continue

    for (const question of list) {
      if (!accept(question)) continue

      const isPoll = question.type === 'poll'
      const characterId = question.characterId
        ? (refs.characterIds.get(question.characterId) ?? null)
        : null
      // A poll has no owner on purpose; anything else without one was already
      // reported by the validation and would only break the foreign key.
      if (!isPoll && characterId === null) continue

      const values = {
        chapterId,
        characterId: isPoll ? null : characterId,
        ordinal: isPoll ? null : (question.ordinal ?? null),
        type: question.type,
        source: question.source,
        isPrivate: question.isPrivate,
        pollQuestionId: question.pollRef ? (refs.questionIds.get(question.pollRef) ?? null) : null,
        text: question.text,
        targetScaleId:
          question.type === 'scale_direct' && question.target
            ? (refs.scaleIds.get(question.target.key) ?? null)
            : null,
        targetResourceId:
          question.type === 'resource_direct' && question.target
            ? (refs.resourceIds.get(question.target.key) ?? null)
            : null,
        allowOther: question.options.some((option) => option.isOther),
      }
      const [row] = await scope
        .insert(questions, { externalId: question.externalId, ...values })
        .onConflictDoUpdate({ target: [questions.runId, questions.externalId], set: values })
        .returning({ id: questions.id })
      if (!row) continue

      written.questions.add(row.id)
      refs.questionIds.set(question.externalId, row.id)
    }
  }
}

const upsertAnswerOptions = async (
  scope: RunScope,
  config: ParsedConfig,
  written: WrittenRows,
  refs: EntityIds,
): Promise<IdMap> => {
  const optionIds: IdMap = new Map()

  for (const list of config.questions.values()) {
    for (const question of list) {
      const questionId = refs.questionIds.get(question.externalId)
      if (!questionId) continue

      for (const option of question.options) {
        const values = {
          questionId,
          ordinal: option.ordinal,
          label: option.label,
          referencedCharacterId: option.referencedCharacter
            ? (refs.characterIds.get(option.referencedCharacter) ?? null)
            : null,
          isOther: option.isOther,
        }
        const [row] = await scope
          .insert(answerOptions, { externalId: option.externalId, ...values })
          .onConflictDoUpdate({
            target: [answerOptions.runId, answerOptions.externalId],
            set: values,
          })
          .returning({ id: answerOptions.id })
        if (!row) continue

        written.answerOptions.add(row.id)
        optionIds.set(option.externalId, row.id)
      }
    }
  }

  return optionIds
}
