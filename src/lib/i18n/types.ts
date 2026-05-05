import type { messages as enMessages } from '@/messages/en-US'

export type Locale = 'en-US' | 'pl-PL'

// Deep type to convert literal values to string for flexible localization
type DeepStringify<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? DeepStringify<U>[]
    : T extends object
      ? { [K in keyof T]: DeepStringify<T[K]> }
      : T

// Flexible Messages type that accepts any translated strings
export type Messages = DeepStringify<typeof enMessages>

export interface LocaleContextValue {
  locale: Locale
  messages: Messages
  isLoading: boolean
  setLocale: (locale: Locale) => Promise<void>
}
