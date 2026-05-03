'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { CalendarGrid } from '@/components/calendar/CalendarGrid'
import { CalendarRightSidebar } from '@/components/calendar/CalendarRightSidebar'
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet'
import { useViewStore } from '@/stores/useViewStore'
import { useCalendarVisibilityStore } from '@/stores/useCalendarVisibilityStore'
import { useTaskSheetStore } from '@/stores/useTaskSheetStore'
import { useWeekStartsOn } from '@/lib/preferences'
import { useGroupsStore } from '@/stores/useGroupsStore'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Tag, Task, TaskGroup } from '@/types'

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function getWeekRange(date: Date, weekStartsOn: number): { start: Date; end: Date } {
  const day = date.getDay()
  const diff = (day - weekStartsOn + 7) % 7
  const start = new Date(date)
  start.setDate(date.getDate() - diff)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start, end }
}

function formatPeriodLabel(date: Date, view: 'day' | 'week' | 'month', weekStartsOn: number): string {
  if (view === 'day') {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }
  if (view === 'month') {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  const { start, end } = getWeekRange(date, weekStartsOn)
  const startLabel = start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const endLabel = end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  return `Week of ${startLabel}–${endLabel}`
}

interface CalendarClientProps {
  initialTasks: Task[]
  initialGroups: TaskGroup[]
  tags: Tag[]
}

export function CalendarClient({ initialTasks, initialGroups, tags }: CalendarClientProps) {
  const { calendarView, setCalendarView } = useViewStore()
  const { hiddenGroupIds } = useCalendarVisibilityStore()
  const { isOpen: isTaskSheetOpen, open: openTaskSheet } = useTaskSheetStore()
  const weekStartsOn = useWeekStartsOn()

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date())
  const [miniCalDate, setMiniCalDate] = useState<Date>(() => new Date())
  const [todayFlash, setTodayFlash] = useState(false)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const { groups, setGroups } = useGroupsStore()

  useEffect(() => {
    setGroups(initialGroups)
  }, [initialGroups, setGroups])

  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const navigate = useCallback(
    (direction: -1 | 1) => {
      setCurrentDate((prev) => {
        const next = new Date(prev)
        if (calendarView === 'day') {
          next.setDate(prev.getDate() + direction)
        } else if (calendarView === 'week') {
          next.setDate(prev.getDate() + direction * 7)
        } else {
          next.setMonth(prev.getMonth() + direction)
        }
        setMiniCalDate(new Date(next))
        return next
      })
    },
    [calendarView]
  )

  const goToday = useCallback(() => {
    const now = new Date()
    setCurrentDate(now)
    setMiniCalDate(new Date(now))
    setTodayFlash(true)
    if (flashTimeout.current) clearTimeout(flashTimeout.current)
    flashTimeout.current = setTimeout(() => setTodayFlash(false), 800)
  }, [])

  const handleMiniCalSelectDate = useCallback((date: Date) => {
    setCurrentDate(date)
  }, [])

  const handleMiniCalPrevMonth = useCallback(() => {
    setMiniCalDate((prev) => {
      const next = new Date(prev)
      next.setMonth(prev.getMonth() - 1)
      return next
    })
  }, [])

  const handleMiniCalNextMonth = useCallback(() => {
    setMiniCalDate((prev) => {
      const next = new Date(prev)
      next.setMonth(prev.getMonth() + 1)
      return next
    })
  }, [])

  const handleClickSlot = useCallback(
    (date: Date, slotIndex?: number) => {
      const dueDate = new Date(date)
      if (slotIndex !== undefined) {
        const hours = Math.floor((slotIndex * 30) / 60)
        const minutes = (slotIndex * 30) % 60
        dueDate.setHours(hours, minutes, 0, 0)
      }
      openTaskSheet(null, { dueDate: dueDate.toISOString() })
    },
    [openTaskSheet]
  )

  const handleTaskClick = useCallback(
    (taskId: string) => {
      openTaskSheet(taskId)
    },
    [openTaskSheet]
  )

  const periodLabel = useMemo(
    () => formatPeriodLabel(currentDate, calendarView, weekStartsOn),
    [currentDate, calendarView, weekStartsOn]
  )

  return (
    <div className="flex h-full overflow-hidden p-6">
      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 flex-shrink-0">
          <button
            type="button"
            onClick={goToday}
            className={cn(
              'inline-flex items-center px-3 h-8 rounded-md border border-border text-sm',
              'bg-background hover:bg-accent transition-colors',
              isSameDay(currentDate, new Date()) && 'border-primary/50'
            )}
          >
            Today
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="size-8 flex items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
            aria-label="Previous period"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
          </button>

          <button
            type="button"
            onClick={() => navigate(1)}
            className="size-8 flex items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
            aria-label="Next period"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
          </button>

          <span className="text-sm font-medium text-foreground flex-1 truncate">{periodLabel}</span>

          <Select
            value={calendarView}
            onValueChange={(v) => setCalendarView(v as 'day' | 'week' | 'month')}
          >
            <SelectTrigger className="w-28 h-8 text-sm focus:ring-0 focus:border-primary/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        <div className="flex-1 flex flex-col overflow-hidden border border-border/40 rounded-lg min-h-0">
          <CalendarGrid
            tasks={tasks}
            groups={groups}
            hiddenGroupIds={hiddenGroupIds}
            calendarView={calendarView}
            currentDate={currentDate}
            weekStartsOn={weekStartsOn}
            todayFlash={todayFlash}
            onClickSlot={handleClickSlot}
            onTaskClick={handleTaskClick}
          />
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-4 flex-shrink-0" />
      <CalendarRightSidebar
        currentDate={miniCalDate}
        selectedDate={currentDate}
        calendarView={calendarView}
        weekStartsOn={weekStartsOn}
        isTaskSheetOpen={isTaskSheetOpen}
        onSelectDate={handleMiniCalSelectDate}
        onPrevMonth={handleMiniCalPrevMonth}
        onNextMonth={handleMiniCalNextMonth}
      />

      <TaskDetailSheet tasks={tasks} groups={groups} tags={tags} onTaskUpdated={(updatedTask) => {
        setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)))
      }} />
    </div>
  )
}
