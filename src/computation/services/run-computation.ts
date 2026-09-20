import { randomInt } from 'node:crypto'
import { forRun, type RunScope } from '@/db'
import {
  createInitialState,
  EngineInputError,
  evaluate,
  CHAPTER_NUMBERS,
  type ChapterNumber,
  type EngineConfig,
  type RunState,
} from '@/engine'
import { FIRST_CHAPTER } from '@/db/constants/chapters'
import { DICE_MIN, DICE_SIDES } from '../constants/dice'
import { answersFromRows } from '../convert/answers-from-rows'
import { buildIdDirectory } from '../convert/build-id-directory'
import { inputHash } from '../convert/input-hash'
import { resolveRolls } from '../convert/resolve-rolls'
import { rollsFromRows } from '../convert/rolls-from-rows'
import { snapshotToState } from '../convert/snapshot-to-state'
import { splitEngineProblems } from '../convert/split-engine-problems'
import type { ComputationOutcome } from '../types/computation-outcome'
import type { IdDirectory } from '../types/id-directory'
import { loadAnswerRows, loadRollRows } from './load-answer-rows'
import { loadBaseline, loadSnapshotRows } from './load-baseline'
import { loadConfigRows } from './load-config-rows'
import { loadEngineConfig } from './load-engine-config'
import { saveComputation } from './save-computation'

export interface ComputationRequest {
  runId: string
  chapter: number
  /** From `readAuthor` — the server reads it, no form sends it. */
  author: string
}

const isChapterNumber = (chapter: number): chapter is ChapterNumber =>
  (CHAPTER_NUMBERS as readonly number[]).includes(chapter)

/** `randomInt`'s upper bound is exclusive. */
const rollDie = (): number => randomInt(DICE_MIN, DICE_SIDES + 1)

/** Chapter 1 starts from the config, every later one from the chapter before's baseline snapshot (§4.3). */
const loadStartingState = async (
  scope: RunScope,
  chapter: ChapterNumber,
  config: EngineConfig,
  directory: IdDirectory,
): Promise<RunState | undefined> => {
  if (chapter === FIRST_CHAPTER) return createInitialState(config)

  const previousChapter = chapter - 1
  const baseline = await loadBaseline(scope, directory.chapters.toDb(previousChapter))
  if (!baseline) return undefined

  return snapshotToState(await loadSnapshotRows(scope, baseline.id), previousChapter, directory)
}

interface LoadedConfig {
  config: EngineConfig
  configUploadId: string
}

const computeWith = async (
  scope: RunScope,
  request: ComputationRequest,
  chapter: ChapterNumber,
  { config, configUploadId }: LoadedConfig,
): Promise<ComputationOutcome> => {
  const configRows = await loadConfigRows(scope)
  const directory = buildIdDirectory(configRows)
  if (!directory.chapters.has(chapter)) return { _type: 'unknown_chapter', chapter }

  const state = await loadStartingState(scope, chapter, config, directory)
  if (!state) return { _type: 'no_baseline', missingChapter: chapter - 1 }

  const answers = answersFromRows(await loadAnswerRows(scope), configRows, directory, chapter)
  const storedRolls = rollsFromRows(await loadRollRows(scope), directory)

  const { result, rolls, newRolls } = resolveRolls(
    (withRolls) => evaluate(state, { chapter, answers, rolls: withRolls }, config),
    storedRolls,
    rollDie,
  )
  const hash = inputHash(state, { chapter, answers, rolls }, config)
  const saved = await saveComputation(
    scope,
    {
      chapter,
      chapterId: directory.chapters.toDb(chapter),
      result,
      newRolls,
      configUploadId,
      inputHash: hash,
      author: request.author,
    },
    directory,
  )

  return {
    _type: 'computed',
    computationId: saved.computationId,
    chapter,
    version: saved.version,
    conflictCount: result.conflicts.length,
    newRolls,
    inputHash: hash,
  }
}

const compute = async (scope: RunScope, request: ComputationRequest): Promise<ComputationOutcome> => {
  const { chapter } = request
  if (!isChapterNumber(chapter)) return { _type: 'unknown_chapter', chapter }

  const loaded = await loadEngineConfig(scope)
  if (loaded._type === 'no_config') return { _type: 'no_config' }
  if (loaded._type === 'unusable') return { _type: 'config_unusable', filename: loaded.filename, errors: loaded.errors }

  try {
    return await computeWith(scope, request, chapter, loaded)
  } catch (cause) {
    // The engine refusing its input is an answer for the org, not a crash; it threw before anything was written.
    if (!(cause instanceof EngineInputError)) throw cause

    const { missingAnswers, otherProblems } = splitEngineProblems(cause.problems, loaded.config)

    // Bad input beyond missing answers is the more fundamental problem of the two.
    return otherProblems.length > 0
      ? { _type: 'rejected', problems: otherProblems }
      : { _type: 'missing_answers', missingAnswers }
  }
}

/**
 * load → `evaluate` → save, in one transaction: either the computation, its
 * snapshot, the selected variants, the new rolls and the audit are all stored,
 * or nothing is. Every call is a new draft version — a dry-run can be fired a
 * hundred times (rule 3).
 */
export const runComputation = (request: ComputationRequest): Promise<ComputationOutcome> =>
  forRun(request.runId).transaction((scope) => compute(scope, request))
