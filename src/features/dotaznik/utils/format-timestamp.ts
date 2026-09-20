import { APP_LOCALE } from '@/locales/app-locale'

/** Day and minute are enough to tell this morning's entry from yesterday's. */
const TIMESTAMP_FORMAT = new Intl.DateTimeFormat(APP_LOCALE, {
  day: 'numeric',
  month: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export const formatTimestamp = (iso: string): string => TIMESTAMP_FORMAT.format(new Date(iso))
