'use client'

import { useLocale } from './LocaleContext'

export function useI18n() {
  const { messages, locale, setLocale, isLoading } = useLocale()
  return {
    t: messages,
    locale,
    setLocale,
    isLoading,
  }
}
