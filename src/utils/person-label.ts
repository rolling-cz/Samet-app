import { common } from '@/locales/cs/common'

/** `Marie Balážová`; the registry ID when both names are empty, so a row is never blank. */
export const personLabel = (firstName: string, lastName: string, id: string): string =>
  common.fullName(firstName, lastName).trim() || id
