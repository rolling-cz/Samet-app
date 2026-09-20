'use client'

import { createContext } from 'react'
import type { CharacterCompletion } from '@/computation'
import type { RunCompletion } from '../types/run-completion'

export type ReportChapterCompletion = (chapter: number, characters: readonly CharacterCompletion[]) => void

const EMPTY_COMPLETION: RunCompletion = Object.freeze({})

export const CompletionContext = createContext<RunCompletion>(EMPTY_COMPLETION)

/** Split from the value so that reporting a save does not re-render on every other save. */
export const ReportCompletionContext = createContext<ReportChapterCompletion>(() => undefined)
