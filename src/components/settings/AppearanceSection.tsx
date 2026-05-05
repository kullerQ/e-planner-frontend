'use client'

import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { messages } from '@/lib/messages'
import { cn } from '@/lib/utils'
import { HugeiconsIcon } from '@hugeicons/react'
import { Sun02Icon, Moon02Icon, ComputerIcon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@/types'
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
  const [mounted, setMounted] = useState(false)
  const [language, setLanguage] = useState<'en' | 'pl'>(user.preferences?.language ?? 'en')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setLanguage(user.preferences?.language ?? 'en')
  }, [user.preferences?.language])

  const handleLanguageChange = useCallback(async (value: 'en' | 'pl') => {
    if (value === language) return
    setLanguage(value)
    setSaveStatus('saving')
    const result = await updateLanguagePreference({ language: value })
    if (result.success) {
      setSaveStatus('saved')
      router.refresh()
    } else {
      setSaveStatus('error')
      setLanguage(user.preferences?.language ?? 'en')
    }
    setTimeout(() => setSaveStatus('idle'), 2000)
  }, [language, user.preferences?.language, router])

  if (!mounted) {
    return null
  }

  const currentTheme = theme || 'system'

  return (
    <div className="space-y-8 max-w-xl">
      <div className="space-y-2">
        <h2 className="text-base font-medium text-foreground mb-4">
          {messages.settings.appearance}
        </h2>
      </div>

      {/* Theme Toggle */}
      <div className="space-y-3">
        <Label>{messages.settings.theme}</Label>
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
            {messages.settings.themeLight}
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
            {messages.settings.themeDark}
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
            {messages.settings.themeSystem}
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
        <Label>{messages.settings.language}</Label>
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
              <SelectItem value="en">{messages.settings.languageEnglish}</SelectItem>
              <SelectItem value="pl">{messages.settings.languagePolish}</SelectItem>
            </SelectContent>
          </Select>
          {saveStatus === 'saved' && (
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} className="text-green-500" />
          )}
        </div>
        {saveStatus === 'error' && (
          <p className="text-sm text-destructive">{messages.settings.saveError}</p>
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
