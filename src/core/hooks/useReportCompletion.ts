'use client'

import { useContext } from 'react'
import { ReportCompletionContext } from '../providers/completion-context'

export const useReportCompletion = () => useContext(ReportCompletionContext)
