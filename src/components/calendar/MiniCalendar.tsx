'use client'

import { useMemo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import type { WeekStartsOn } from '@/lib/preferences'

interface MiniCalendarProps {
  currentDate: Date
  selectedDate: Date
  calendarView: 'day' | 'week' | 'month'
  weekStartsOn: WeekStartsOn
  onSelectDate: (date: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

const DAY_NAMES_MON = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const DAY_NAMES_SUN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function getWeekDates(date: Date, weekStartsOn: WeekStartsOn): Date[] {
  const day = date.getDay()
  const diff = (day - weekStartsOn + 7) % 7
  const monday = new Date(date)
  monday.setDate(date.getDate() - diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isSameWeek(a: Date, b: Date, weekStartsOn: WeekStartsOn) {
  const weekA = getWeekDates(a, weekStartsOn)
  return weekA.some((d) => isSameDay(d, b))
}

export function MiniCalendar({
  currentDate,
  selectedDate,
  calendarView,
  weekStartsOn,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: MiniCalendarProps) {
  const today = useMemo(() => new Date(), [])

  const dayNames = weekStartsOn === 0 ? DAY_NAMES_SUN : DAY_NAMES_MON

  const { year, month } = useMemo(() => ({
    year: currentDate.getFullYear(),
    month: currentDate.getMonth(),
  }), [currentDate])

  const monthLabel = useMemo(
    () =>
      currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    [currentDate]
  )

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const startOffset = (firstDay.getDay() - weekStartsOn + 7) % 7
    const days: { date: Date; inMonth: boolean }[] = []

    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(firstDay)
      d.setDate(firstDay.getDate() - i - 1)
      days.push({ date: d, inMonth: false })
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: new Date(year, month, d), inMonth: true })
    }

    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(lastDay)
        d.setDate(lastDay.getDate() + i)
        days.push({ date: d, inMonth: false })
      }
    }

    return days
  }, [year, month, weekStartsOn])

  const weeks = useMemo(() => {
    const result: { date: Date; inMonth: boolean }[][] = []
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7))
    }
    return result
  }, [calendarDays])

  return (
    <div className="px-3 pt-3 pb-2">
      {/* Month header */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={onPrevMonth}
          className="size-6 flex items-center justify-center rounded hover:bg-accent transition-colors"
          aria-label="Previous month"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={12} className="text-muted-foreground" />
        </button>
        <span className="text-xs font-medium text-foreground">{monthLabel}</span>
        <button
          type="button"
          onClick={onNextMonth}
          className="size-6 flex items-center justify-center rounded hover:bg-accent transition-colors"
          aria-label="Next month"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} size={12} className="text-muted-foreground" />
        </button>
      </div>

      {/* Day name headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map((name) => (
          <div key={name} className="text-center text-xs text-muted-foreground py-0.5">
            {name}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => {
        const isCurrentWeek =
          calendarView === 'week' && week.some((d) => isSameWeek(d.date, selectedDate, weekStartsOn))

        return (
          <div
            key={wi}
            className={cn(
              'grid grid-cols-7',
              isCurrentWeek && 'bg-primary/10 rounded-md'
            )}
          >
            {week.map(({ date, inMonth }) => {
              const isToday = isSameDay(date, today)
              const isSelected =
                calendarView === 'day' && isSameDay(date, selectedDate)

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => onSelectDate(date)}
                  className={cn(
                    'size-6 mx-auto flex items-center justify-center text-xs rounded-full',
                    'transition-colors hover:bg-accent',
                    !inMonth && 'text-muted-foreground/40',
                    inMonth && !isToday && !isSelected && 'text-foreground',
                    isToday && !isSelected && 'text-primary font-semibold',
                    isSelected && 'bg-primary text-primary-foreground font-semibold'
                  )}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
