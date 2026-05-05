'use client'

import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/messages'
import { cn } from '@/lib/utils'
import { HugeiconsIcon } from '@hugeicons/react'
import { Sun02Icon, Moon02Icon, ComputerIcon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons'
import { useEffect, useState, useCallback } from 'react'
import type { User } from '@/types'
import type { Locale } from '@/lib/i18n'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateLanguagePreference } from '@/actions/settings'

interface AppearanceSectionProps {
  user: User
}

export function AppearanceSection({ user }: AppearanceSectionProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { t, setLocale } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [language, setLanguage] = useState<Locale>(user.preferences?.language ?? 'en-US')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setLanguage(user.preferences?.language ?? 'en-US')
  }, [user.preferences?.language])

  const handleLanguageChange = useCallback(async (value: Locale) => {
    if (value === language) return
    setLanguage(value)
    setSaveStatus('saving')

    // Update locale dynamically for immediate UI feedback
    await setLocale(value)

    // Persist to server
    const result = await updateLanguagePreference({ language: value })
    if (result.success) {
      setSaveStatus('saved')
      // Store in localStorage to sync across tabs
      localStorage.setItem('eplanner-locale', value)
    } else {
      setSaveStatus('error')
      setLanguage(user.preferences?.language ?? 'en-US')
    }
    setTimeout(() => setSaveStatus('idle'), 2000)
  }, [language, user.preferences?.language, setLocale])

  if (!mounted) {
    return null
  }

  const currentTheme = theme || 'system'

  return (
    <div className="space-y-8 max-w-xl">
      <div className="space-y-2">
        <h2 className="text-base font-medium text-foreground mb-4">
          {t.settings.appearance}
        </h2>
      </div>

      {/* Theme Toggle */}
      <div className="space-y-3">
        <Label>{t.settings.theme}</Label>
        <div className="flex gap-2">
          <Button
            variant={currentTheme === 'light' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTheme('light')}
            className={cn(
              'flex items-center gap-2',
              currentTheme === 'light' && 'bg-primary text-primary-foreground'
            )}
          >
            <HugeiconsIcon icon={Sun02Icon} size={16} />
            {t.settings.themeLight}
          </Button>
          <Button
            variant={currentTheme === 'dark' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTheme('dark')}
            className={cn(
              'flex items-center gap-2',
              currentTheme === 'dark' && 'bg-primary text-primary-foreground'
            )}
          >
            <HugeiconsIcon icon={Moon02Icon} size={16} />
            {t.settings.themeDark}
          </Button>
          <Button
            variant={currentTheme === 'system' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTheme('system')}
            className={cn(
              'flex items-center gap-2',
              currentTheme === 'system' && 'bg-primary text-primary-foreground'
            )}
          >
            <HugeiconsIcon icon={ComputerIcon} size={16} />
            {t.settings.themeSystem}
          </Button>
        </div>
        {resolvedTheme && theme === 'system' && (
          <p className="text-xs text-muted-foreground">
            Currently using {resolvedTheme} mode
          </p>
        )}
      </div>

      {/* Language Selector */}
      <div className="space-y-3">
        <Label>{t.settings.language}</Label>
        <div className="flex items-center gap-3">
          <Select
            value={language}
            onValueChange={handleLanguageChange}
            disabled={saveStatus === 'saving'}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en-US">{t.settings.languageEnglish}</SelectItem>
              <SelectItem value="pl-PL">{t.settings.languagePolish}</SelectItem>
            </SelectContent>
          </Select>
          {saveStatus === 'saved' && (
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} className="text-green-500" />
          )}
        </div>
        {saveStatus === 'error' && (
          <p className="text-sm text-destructive">{t.settings.saveError}</p>
        )}
      </div>

    </div>
  )
}

// Label component for internal use
function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      {children}
    </label>
  )
}
