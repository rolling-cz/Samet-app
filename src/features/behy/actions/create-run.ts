'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { adminRoute, failedFormState, HOME_ROUTE, isCalendarDate, type FormState } from '@/core'
import { readAuthor } from '@/core/services/auth-cookies'
import { createRun } from '@/db'
import { errors } from '@/locales/cs/errors'
import { errorMessage } from '@/utils/error-message'
import { readFormField } from '@/utils/read-form-field'
import { RUN_FIELDS } from '../constants/run-fields'
import { readRunLabel } from '../utils/read-run-label'

/** Creates the run and opens its Správa — a run exists so that a config has somewhere to land. */
export const createRunAction = async (_previous: FormState, formData: FormData): Promise<FormState> => {
  const author = await readAuthor()
  if (author === '') return failedFormState(errors.authorInvalid)

  const startDate = readFormField(formData, RUN_FIELDS.startDate)
  if (!isCalendarDate(startDate)) return failedFormState(errors.invalidStartDate)

  const label = readRunLabel(formData)
  if (label._type === 'invalid') return failedFormState(label.message)

  let runId: string
  try {
    runId = await createRun({ startDate, label: label.label, author })
  } catch (cause) {
    return failedFormState(errorMessage(cause))
  }

  revalidatePath(HOME_ROUTE, 'layout')
  // A fresh run has no config yet, so it starts in Správa.
  redirect(adminRoute(runId))
}
