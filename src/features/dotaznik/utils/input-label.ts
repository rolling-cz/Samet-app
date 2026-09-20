import type { HouseholdEffectView, InputFieldView } from '@/computation'
import { common } from '@/locales/cs/common'
import { dotaznik } from '@/locales/cs/dotaznik'

/** The field is named after whose money it moves and which way, not after `input1` (§4.4). */
export const inputLabel = (field: InputFieldView, effect: HouseholdEffectView | undefined): string => {
  if (!field.person || !effect) return dotaznik.inputGeneric(field.key)

  const name = common.fullName(field.person.firstName, field.person.lastName)

  return effect.kind === 'household_create' ? dotaznik.inputDeposit(name) : dotaznik.inputPayout(name)
}
