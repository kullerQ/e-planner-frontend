// Re-export i18n system for dynamic locale switching (client-safe only).
// Server: import getServerMessages from '@/lib/i18n/server' — do not add server exports here or client bundles pull next/headers.
export { LocaleProvider, useLocale, loadMessages } from './i18n'
export { useI18n } from './i18n/useI18n'
export type { Locale, Messages, LocaleContextValue } from './i18n'

// Import type for static usage if needed
export type { messages as MessagesType } from '@/messages/en-US'

// Backward-compatible static export (fallback to English)
// Components should migrate to useI18n() hook for dynamic localization
import { messages as enMessages } from '@/messages/en-US'
export { enMessages as messages }
