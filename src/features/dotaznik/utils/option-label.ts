import type { OptionView } from '@/computation'
import { common } from '@/locales/cs/common'
import { dotaznik } from '@/locales/cs/dotaznik'

/** An option naming a character shows the registry name, never the bare ID — a marriage changes the surname (§6.1). */
export const optionLabel = (option: OptionView): string => {
  if (option.referencedPerson) return common.fullName(option.referencedPerson.firstName, option.referencedPerson.lastName)

  return option.isOther ? dotaznik.otherOption : option.label
}
