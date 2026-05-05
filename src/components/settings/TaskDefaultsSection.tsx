'use client'

import { useSettingsStore } from '@/stores/useSettingsStore'
import { useI18n } from '@/lib/messages'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { WeekStartsOn } from '@/lib/preferences'

export function TaskDefaultsSection() {
  const { t } = useI18n()
  const { defaultStatus, weekStartsOn, setDefaultStatus, setWeekStartsOn } =
    useSettingsStore()

  const STATUS_OPTIONS: { value: 'todo' | 'in_progress'; label: string }[] = [
    { value: 'todo', label: t.tasks.status.todo },
    { value: 'in_progress', label: t.tasks.status.in_progress },
  ]

  const WEEK_START_OPTIONS: { value: WeekStartsOn; label: string }[] = [
    { value: 1, label: t.settings.weekStartsMonday },
    { value: 0, label: t.settings.weekStartsSunday },
  ]

  return (
    <div className="space-y-6 max-w-xl">
      <div className="space-y-2">
        <h2 className="text-base font-medium text-foreground mb-4">
          {t.settings.taskDefaults}
        </h2>
      </div>

      {/* Default Status */}
      <div className="space-y-2">
        <Label>{t.settings.defaultStatus}</Label>
        <Select
          value={defaultStatus}
          onValueChange={(value) => setDefaultStatus(value as 'todo' | 'in_progress')}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Week Starts On */}
      <div className="space-y-2">
        <Label>{t.settings.weekStartsOn}</Label>
        <Select
          value={String(weekStartsOn)}
          onValueChange={(value) => setWeekStartsOn(Number(value) as WeekStartsOn)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEEK_START_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          This setting affects the Calendar view column order.
        </p>
      </div>
    </div>
  )
}

// Label component for internal use
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
      {children}
    </label>
  )
}
