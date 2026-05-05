'use client'

import { useState, useCallback, useRef } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ViewIcon, ViewOffSlashIcon, Add01Icon } from '@hugeicons/core-free-icons'
import { MiniCalendar } from './MiniCalendar'
import { useCalendarVisibilityStore } from '@/stores/useCalendarVisibilityStore'
import { useGroupsStore } from '@/stores/useGroupsStore'
import { createGroup } from '@/actions/groups'
import { cn, randomGroupColor } from '@/lib/utils'
import { useI18n } from '@/lib/messages'
import { toast } from 'sonner'
import type { WeekStartsOn } from '@/lib/preferences'

interface CalendarRightSidebarProps {
  currentDate: Date
  selectedDate: Date
  calendarView: 'day' | 'week' | 'month'
  weekStartsOn: WeekStartsOn
  isTaskSheetOpen: boolean
  onSelectDate: (date: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

export function CalendarRightSidebar({
  currentDate,
  selectedDate,
  calendarView,
  weekStartsOn,
  isTaskSheetOpen,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: CalendarRightSidebarProps) {
  const { t } = useI18n()
  const { hiddenGroupIds, toggleGroup } = useCalendarVisibilityStore()
  const { groups, addGroup } = useGroupsStore()

  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasSubmittedRef = useRef(false)

  const handleNewFolderSubmit = useCallback(async () => {
    if (hasSubmittedRef.current || isSubmitting) return
    hasSubmittedRef.current = true

    const name = newFolderName.trim()
    if (!name) {
      hasSubmittedRef.current = false
      setIsCreating(false)
      setNewFolderName('')
      return
    }
    setIsSubmitting(true)
    try {
      const group = await createGroup({ name, colorHex: randomGroupColor() })
      addGroup(group)
      toast.success(t.dashboard.folders.createdSuccess)
    } catch {
      toast.error(t.dashboard.folders.createError)
    } finally {
      setIsSubmitting(false)
      setIsCreating(false)
      setNewFolderName('')
      hasSubmittedRef.current = false
    }
  }, [newFolderName, addGroup, isSubmitting, t])

  const handleNewFolderKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        void handleNewFolderSubmit()
      } else if (e.key === 'Escape') {
        setIsCreating(false)
        setNewFolderName('')
      }
    },
    [handleNewFolderSubmit]
  )

  return (
    <aside
      className={cn(
        'w-52 flex-shrink-0 border-l border-border/50 flex flex-col overflow-hidden',
        'transition-transform duration-300 ease-in-out',
        isTaskSheetOpen && 'translate-x-full opacity-0 pointer-events-none'
      )}
    >
      {/* Mini Calendar */}
      <MiniCalendar
        currentDate={currentDate}
        selectedDate={selectedDate}
        calendarView={calendarView}
        weekStartsOn={weekStartsOn}
        onSelectDate={onSelectDate}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
      />

      <div className="border-t border-border/40" />

      {/* Folder visibility */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 pt-4 pb-2">
          {t.dashboard.folders.title}
        </p>

        <div className="flex-1 overflow-y-auto">
          {groups.map((group) => {
            const isHidden = hiddenGroupIds.has(group.id)
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-left',
                  'hover:bg-accent/50 transition-colors',
                  isHidden && 'opacity-50'
                )}
              >
                <span
                  className="size-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: group.colorHex }}
                />
                <span className="text-sm truncate flex-1 text-foreground">{group.name}</span>
                <HugeiconsIcon
                  icon={isHidden ? ViewOffSlashIcon : ViewIcon}
                  size={14}
                  className="text-muted-foreground flex-shrink-0"
                />
              </button>
            )
          })}
        </div>

        {/* New Folder */}
        <div className="border-t border-border/40 p-3">
          {isCreating ? (
            <input
              autoFocus
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={handleNewFolderKeyDown}
              onBlur={() => {
                // Skip if already submitted via Enter key
                if (!hasSubmittedRef.current) {
                  void handleNewFolderSubmit()
                }
              }}
              disabled={isSubmitting}
              placeholder={t.dashboard.folders.newFolderPlaceholder}
              className={cn(
                'w-full text-sm bg-transparent border border-border rounded px-2 py-1',
                'focus:outline-none focus:ring-1 focus:ring-ring',
                'placeholder:text-muted-foreground/60'
              )}
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <HugeiconsIcon icon={Add01Icon} size={14} />
              {t.folders.newFolder}
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
