'use client'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { formatMonthLong, formatWeekdayShort } from '@/lib/i18n/calendarLabels'
import { useI18n } from '@/lib/messages'
import { useWeekStartsOn } from '@/lib/preferences'
import type { Task } from '@/types'

interface MonthCalendarWidgetProps {
  tasks?: Task[]
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

export function MonthCalendarWidget({ tasks = [] }: MonthCalendarWidgetProps) {
  const { locale } = useI18n()
  const today = new Date()
  const weekStartsOn = useWeekStartsOn()
  const viewYear = today.getFullYear()
  const viewMonth = today.getMonth()

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDayDow = getFirstDayOfMonth(viewYear, viewMonth)
  const firstDay = (firstDayDow - weekStartsOn + 7) % 7

  const orderedWeekDays = useMemo(() => {
    const arr: string[] = []
    for (let i = 0; i < 7; i++) {
      const dow = (weekStartsOn + i) % 7
      arr.push(formatWeekdayShort(locale, dow))
    }
    return arr
  }, [weekStartsOn, locale])

  const monthTitle = useMemo(
    () => formatMonthLong(locale, viewYear, viewMonth),
    [locale, viewYear, viewMonth],
  )

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
          <span className="text-[10px] font-medium uppercase leading-none tracking-[0.08em] text-muted-foreground">
            {viewYear}
          </span>
          <span className="text-sm font-semibold text-foreground leading-tight">
            {monthTitle}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 flex-1">
        {orderedWeekDays.map((d, idx) => (
          <div
            key={`${idx}-${d}`}
            className="pb-1 text-center text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground"
          >
            {d}
          </div>
        ))}

        {cells.map((day, i) => (
          <div key={i} className="flex flex-col items-center justify-start gap-0.5 min-h-[28px]">
            {day !== null ? (
              <>
                <div
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-[11px] leading-none',
                    isToday(day)
                      ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                      : 'text-foreground'
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
