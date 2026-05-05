'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Locale, Messages, LocaleContextValue } from './types'
import { loadMessages } from './loadMessages'

const LocaleContext = createContext<LocaleContextValue | null>(null)

interface LocaleProviderProps {
  children: React.ReactNode
  initialLocale: Locale
  initialMessages: Messages
}

export function LocaleProvider({
  children,
  initialLocale,
  initialMessages,
}: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const [messages, setMessages] = useState<Messages>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)

  const setLocale = useCallback(async (newLocale: Locale) => {
    if (newLocale === locale) return

    setIsLoading(true)
    try {
      const newMessages = await loadMessages(newLocale)
      setLocaleState(newLocale)
      setMessages(newMessages)
    } finally {
      setIsLoading(false)
    }
  }, [locale])

  // Listen for locale change events from other tabs or components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'eplanner-locale' && e.newValue) {
        const newLocale = e.newValue as Locale
        if (newLocale !== locale) {
          setLocale(newLocale)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [locale, setLocale])

  const value: LocaleContextValue = {
    locale,
    messages,
    isLoading,
    setLocale,
  }

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}
