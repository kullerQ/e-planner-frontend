'use client'
import { useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import { messages } from '@/lib/messages'
import { useWeekStartsOn } from '@/lib/preferences'
import type { Task } from '@/types'

interface MonthCalendarWidgetProps {
  tasks?: Task[]
}

const WEEK_DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

export function MonthCalendarWidget({ tasks = [] }: MonthCalendarWidgetProps) {
  const today = new Date()
  const weekStartsOn = useWeekStartsOn()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDayDow = getFirstDayOfMonth(viewYear, viewMonth)
  const firstDay = (firstDayDow - weekStartsOn + 7) % 7

  const orderedWeekDays = useMemo(() => {
    const arr: string[] = []
    for (let i = 0; i < 7; i++) arr.push(WEEK_DAY_LABELS[(weekStartsOn + i) % 7]!)
    return arr
  }, [weekStartsOn])

  const tasksByDay = tasks
    .filter((t) => !t.isDeleted && t.dueDate)
    .reduce<Record<number, string[]>>((acc, t) => {
      const d = new Date(t.dueDate!)
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        const day = d.getDate()
        if (!acc[day]) acc[day] = []
        acc[day]!.push(t.colorHex)
      }
      return acc
    }, {})

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const isToday = (day: number) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear()

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex flex-col">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {viewYear}
          </span>
          <span className="text-sm font-semibold text-foreground leading-tight">
            {MONTH_NAMES[viewMonth]}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={prevMonth}
            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={messages.widgets.monthCalendar.previousMonth}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={13} />
          </button>
          <button
            onClick={nextMonth}
            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={messages.widgets.monthCalendar.nextMonth}
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 flex-1">
        {orderedWeekDays.map((d) => (
          <div key={d} className="text-center text-[9px] text-muted-foreground/70 font-medium uppercase tracking-wider pb-1">
            {d}
          </div>
        ))}

        {cells.map((day, i) => (
          <div key={i} className="flex flex-col items-center justify-start gap-0.5 min-h-[28px]">
            {day !== null ? (
              <>
                <div
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-[11px] leading-none transition-colors',
                    isToday(day)
                      ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                      : 'text-foreground/90 hover:bg-muted/60'
                  )}
                >
                  {day}
                </div>
                <div className="flex gap-0.5 flex-wrap justify-center min-h-[4px]">
                  {(tasksByDay[day] ?? []).slice(0, 3).map((color, di) => (
                    <div
                      key={di}
                      className="size-1 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="size-5" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
