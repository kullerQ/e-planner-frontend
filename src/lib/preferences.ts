export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const DEFAULT_WEEK_STARTS_ON: WeekStartsOn = 1

export function useWeekStartsOn(): WeekStartsOn {
  // TODO: Replace with `useSettingsStore` (Zustand, persisted) or
  //       the backend `User.preferences.weekStartsOn` once the
  //       user-preferences pipeline is in place.
  //       Values: 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
  return DEFAULT_WEEK_STARTS_ON
}
