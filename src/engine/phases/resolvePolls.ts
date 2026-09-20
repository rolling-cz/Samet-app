/**
 * Polls (§6.6): the option with the most votes wins, and a tie goes to the
 * earlier row of the poll definition. Deterministic, so a tie is never a
 * conflict for the org.
 *
 * Every poll played so far is tallied — a later chapter's condition may name an
 * earlier winner — but only the computed chapter's polls are traced and have
 * their effects applied.
 */
import type { Catalog } from '../catalog/buildCatalog'
import type { AnswerLookup } from './indexAnswers'
import type { AnswerOptionId, ChapterNumber, CharacterId, QuestionId } from '../types/ids'
import type { QuestionDefinition } from '../types/question'
import type { PollTally, PollTrace } from '../types/trace'

export interface PollResults {
  winners: Map<QuestionId, AnswerOptionId>
  /** For the computed chapter only. */
  traces: PollTrace[]
}

const tallyPoll = (poll: QuestionDefinition, catalog: Catalog, answers: AnswerLookup): PollTally[] => {
  const voters = new Map<AnswerOptionId, CharacterId[]>()
  for (const option of poll.options) voters.set(option.id, [])

  for (const question of catalog.config.questions) {
    if (question.type !== 'poll-answer' || question.pollId !== poll.id) continue
    const answer = answers.byQuestion.get(question.id)
    if (!answer) continue
    for (const optionId of answer.selectedOptionIds) {
      voters.get(optionId)?.push(question.characterId ?? '?')
    }
  }

  return poll.options.map((option) => {
    const voterIds = voters.get(option.id) ?? []

    return { optionId: option.id, optionLabel: option.label, ordinal: option.ordinal, votes: voterIds.length, voterIds }
  })
}

export const resolvePolls = (catalog: Catalog, answers: AnswerLookup, chapter: ChapterNumber): PollResults => {
  const winners = new Map<QuestionId, AnswerOptionId>()
  const traces: PollTrace[] = []

  for (const poll of catalog.config.questions) {
    if (poll.type !== 'poll' || poll.chapter > chapter) continue

    const tally = tallyPoll(poll, catalog, answers)
    // Options are in definition order, so the first maximum is the earlier row.
    let winner = tally[0]
    for (const entry of tally) {
      if (winner === undefined || entry.votes > winner.votes) winner = entry
    }
    if (winner === undefined) continue

    winners.set(poll.id, winner.optionId)
    if (poll.chapter !== chapter) continue

    const decidedByRowOrder = tally.some((entry) => entry !== winner && entry.votes === winner?.votes)
    traces.push({ phase: 'sber', kind: 'anketa', pollId: poll.id, winnerOptionId: winner.optionId, decidedByRowOrder, tally })
  }

  return { winners, traces }
}
