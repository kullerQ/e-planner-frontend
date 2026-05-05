/**
 * Localized calendar chrome using Intl (aligned with UserPreferences.language).
 * dayOfWeek: 0 = Sunday … 6 = Saturday (same as Date#getDay()).
 */
export function formatWeekdayShort(locale: string, dayOfWeek: number): string {
  const anchorSunday = new Date(2024, 8, 1)
  const d = new Date(anchorSunday)
  d.setDate(anchorSunday.getDate() + dayOfWeek)
  return d.toLocaleDateString(locale, { weekday: 'short' })
}

export function formatMonthLong(locale: string, year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString(locale, { month: 'long' })
}
