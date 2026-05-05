import { enUS, pl } from 'date-fns/locale'
import type { Locale } from './types'

export function dateFnsLocaleFor(locale: Locale) {
  return locale === 'pl-PL' ? pl : enUS
}
