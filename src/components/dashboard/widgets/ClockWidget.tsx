'use client'
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/messages'

function formatTime(date: Date): { hhmm: string; seconds: string } {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  return { hhmm: `${hours}:${minutes}`, seconds }
}

function formatWeekday(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { weekday: 'long' })
}

function formatDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { month: 'long', day: 'numeric' })
}

export function ClockWidget() {
  const { locale } = useI18n()
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const tick = () => setNow(new Date())
    const initial = setTimeout(tick, 0)
    const interval = setInterval(tick, 1000)
    return () => {
      clearTimeout(initial)
      clearInterval(interval)
    }
  }, [])

  const time = now ? formatTime(now) : { hhmm: '--:--', seconds: '--' }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <div className="flex items-baseline gap-1">
        <span className="text-5xl font-light tabular-nums leading-none text-foreground tracking-tight">
          {time.hhmm}
        </span>
        <span className="text-base font-light tabular-nums leading-none text-muted-foreground">
          {time.seconds}
        </span>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {now ? formatWeekday(now, locale) : ''}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {now ? formatDate(now, locale) : ''}
        </span>
      </div>
    </div>
  )
}
