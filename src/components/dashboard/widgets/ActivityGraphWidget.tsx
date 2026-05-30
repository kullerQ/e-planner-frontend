'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useWeekStartsOn, type WeekStartsOn } from '@/lib/preferences'
import { formatWeekdayShort } from '@/lib/i18n/calendarLabels'
import { useI18n } from '@/lib/messages'
import type { ActivityEntry } from '@/app/dashboard/page'

interface ActivityDay {
  date: Date
  count: number
  key: string
  isFuture: boolean
}

interface ActivityGraphWidgetProps {
  activityData?: ActivityEntry[]
}

const CELL_SIZE = 16 // px (square)
const CELL_GAP = 3   // px
const DAY_LABEL_LANE_WIDTH = 36 // w-7 (28px) + gap-2 (8px)
const MICRO_META_CLASS = 'text-[10px] font-medium leading-none tracking-[0.08em] text-muted-foreground'

function getIntensityClass(count: number): string {
  if (count === 0) return 'bg-muted/60'
  if (count <= 2) return 'bg-primary/30'
  if (count <= 4) return 'bg-primary/55'
  if (count <= 7) return 'bg-primary/80'
  return 'bg-primary'
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function formatActivityDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function buildCompletionMap(activityData: ActivityEntry[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const entry of activityData) {
    if (!entry.date) continue
    const d = new Date(entry.date + 'T00:00:00')
    if (Number.isNaN(d.getTime())) continue
    map.set(dateKey(d), entry.count)
  }
  return map
}

function buildActivityGrid(
  weekStartsOn: WeekStartsOn,
  completionMap: Map<string, number>,
  weeksToShow: number,
): ActivityDay[][] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Start of the week containing today (relative to weekStartsOn).
  const todayDow = today.getDay()
  const daysFromWeekStart = (todayDow - weekStartsOn + 7) % 7
  const currentWeekStart = new Date(today)
  currentWeekStart.setDate(currentWeekStart.getDate() - daysFromWeekStart)

  // First-week-start = (weeksToShow - 1) weeks before currentWeekStart.
  const startDate = new Date(currentWeekStart)
  startDate.setDate(startDate.getDate() - 7 * (weeksToShow - 1))

  const weeks: ActivityDay[][] = []
  const cursor = new Date(startDate)
  for (let w = 0; w < weeksToShow; w++) {
    const week: ActivityDay[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(cursor)
      const key = dateKey(date)
      week.push({
        date,
        count: completionMap.get(key) ?? 0,
        key,
        isFuture: date.getTime() > today.getTime(),
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }

  return weeks
}

function buildMonthLabels(
  weeks: ActivityDay[][],
  locale: string,
): { weekIndex: number; weekSpan: number; label: string }[] {
  // First pass: collect every month transition with its starting weekIndex
  const raw: { weekIndex: number; label: string }[] = []
  let lastMonth = -1
  let lastYear = -1
  weeks.forEach((week, wi) => {
    const firstDay = week[0]
    if (!firstDay) return
    const m = firstDay.date.getMonth()
    const y = firstDay.date.getFullYear()
    if (m !== lastMonth || y !== lastYear) {
      raw.push({
        weekIndex: wi,
        label: firstDay.date.toLocaleDateString(locale, { month: 'short' }),
      })
      lastMonth = m
      lastYear = y
    }
  })
  // Second pass: compute weekSpan for each month (next.weekIndex - current.weekIndex)
  const out: { weekIndex: number; weekSpan: number; label: string }[] = []
  raw.forEach((entry, i) => {
    const next = raw[i + 1]
    const span = (next ? next.weekIndex : weeks.length) - entry.weekIndex
    // Skip very narrow first/last partial months that can't fit a centered label
    if (span < 2) return
    out.push({ weekIndex: entry.weekIndex, weekSpan: span, label: entry.label })
  })
  return out
}

export function ActivityGraphWidget({ activityData = [] }: ActivityGraphWidgetProps) {
  const { t, locale } = useI18n()
  const weekStartsOn = useWeekStartsOn()
  const measureRef = useRef<HTMLDivElement | null>(null)
  const [gridWidth, setGridWidth] = useState<number>(0)

  useEffect(() => {
    const el = measureRef.current
    if (!el) return

    const applyWidth = (rawWidth: number) => {
      const next = Math.max(0, rawWidth - DAY_LABEL_LANE_WIDTH)
      setGridWidth((prev) => (prev === next ? prev : next))
    }

    // Apply width only after resize settles. This prevents expensive graph
    // recomputation while the sidebar fold/unfold animation is running.
    const RESIZE_SETTLE_MS = 180
    let latestWidth = el.getBoundingClientRect().width
    let settleTimer: ReturnType<typeof setTimeout> | undefined
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      latestWidth = entry.contentRect.width
      if (settleTimer) clearTimeout(settleTimer)
      settleTimer = setTimeout(() => {
        applyWidth(latestWidth)
      }, RESIZE_SETTLE_MS)
    })
    ro.observe(el)
    // Initial measurement (synchronous so first paint is correct)
    applyWidth(latestWidth)
    return () => {
      if (settleTimer) clearTimeout(settleTimer)
      ro.disconnect()
    }
  }, [])

  const weeksToShow = useMemo(() => {
    if (gridWidth <= 0) return 26
    const perWeek = CELL_SIZE + CELL_GAP
    // Keep a lower bound for small layouts, but allow wider viewports to show
    // additional history columns. The previous hard cap (53) prevented the graph
    // from adapting when the sidebar folded if width was already above that cap.
    return Math.max(8, Math.min(156, Math.floor((gridWidth + CELL_GAP) / perWeek)))
  }, [gridWidth])

  const completionMap = useMemo(() => buildCompletionMap(activityData), [activityData])
  const weeks = useMemo(
    () => buildActivityGrid(weekStartsOn, completionMap, weeksToShow),
    [weekStartsOn, completionMap, weeksToShow],
  )

  const monthLabels = useMemo(() => buildMonthLabels(weeks, locale), [weeks, locale])

  const totalCompleted = useMemo(
    () => weeks.reduce((s, w) => s + w.reduce((s2, d) => s2 + d.count, 0), 0),
    [weeks],
  )
  const totalPluralLabel = totalCompleted === 1 ? t.widgets.activityGraph.task : t.widgets.activityGraph.tasks

  const dayLabels = useMemo(() => {
    const arr: string[] = []
    for (let i = 0; i < 7; i++) {
      const dow = (weekStartsOn + i) % 7
      arr.push(formatWeekdayShort(locale, dow))
    }
    return arr
  }, [weekStartsOn, locale])

  // Week indices where a new year begins (skip index 0 — no delimiter before the first column)
  const yearDelimiters = useMemo(() => {
    const out: { weekIndex: number; year: number }[] = []
    let lastYear = -1
    weeks.forEach((week, wi) => {
      const first = week[0]
      if (!first) return
      const y = first.date.getFullYear()
      if (y !== lastYear) {
        if (wi > 0) out.push({ weekIndex: wi, year: y })
        lastYear = y
      }
    })
    return out
  }, [weeks])

  const fullGridHeight = 7 * CELL_SIZE + 6 * CELL_GAP
  const fullGridWidth =
    weeks.length * CELL_SIZE + Math.max(0, weeks.length - 1) * CELL_GAP

  const isLoading = gridWidth <= 0

  // Heavy block: day-label column + the full cell grid (up to ~371 tooltip
  // nodes). Memoized so it only rebuilds when the column count (weeksToShow ->
  // weeks) or locale actually changes — NOT on every transient width update
  // during the sidebar fold animation.
  const gridBlock = useMemo(() => {
    const gridStyle: React.CSSProperties = {
      gridTemplateColumns: `repeat(${weeks.length}, ${CELL_SIZE}px)`,
      gridTemplateRows: `repeat(7, ${CELL_SIZE}px)`,
      gap: `${CELL_GAP}px`,
    }

    return (
      <div className="flex items-start gap-2">
        <div className="flex flex-col shrink-0" style={{ gap: `${CELL_GAP}px` }}>
          {dayLabels.map((label, i) => (
            <span
              key={i}
              className={`text-right pr-1 w-7 ${MICRO_META_CLASS}`}
              style={{ height: `${CELL_SIZE}px`, lineHeight: `${CELL_SIZE}px` }}
            >
              {i % 2 === 1 ? label : ''}
            </span>
          ))}
        </div>

        {/* Wrapper so year delimiters can be absolutely positioned over the grid */}
        <div className="relative shrink-0" style={{ width: `${fullGridWidth}px` }}>
          {yearDelimiters.map(({ weekIndex, year }) => {
            const left = weekIndex * (CELL_SIZE + CELL_GAP) - CELL_GAP / 2
            return (
              <div
                key={year}
                className="absolute top-0 z-10 pointer-events-none flex flex-col items-center -translate-x-1/2"
                style={{ left: `${left}px`, height: `${fullGridHeight}px` }}
              >
                <span className="-mt-[18px] mb-0.5 rounded-sm bg-primary/20 px-1 py-px text-[10px] font-semibold leading-none tracking-[0.08em] text-primary">
                  {year}
                </span>
                <div
                  className="w-px bg-gradient-to-b from-primary/60 via-primary/30 to-primary/10"
                  style={{ height: `${fullGridHeight}px` }}
                />
              </div>
            )
          })}

          <div className="grid" style={gridStyle}>
            {weeks.map((week, wi) =>
              week.map((day, di) => {
                if (day.isFuture) {
                  return (
                    <div
                      key={day.key}
                      aria-hidden
                      style={{ gridColumn: wi + 1, gridRow: di + 1 }}
                    />
                  )
                }
                return (
                  <Tooltip key={day.key}>
                    <TooltipTrigger asChild>
                      <div
                        style={{ gridColumn: wi + 1, gridRow: di + 1 }}
                        className={`rounded-[3px] cursor-default transition-all hover:ring-2 hover:ring-primary/40 ${getIntensityClass(day.count)}`}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">
                        {t.widgets.activityGraph.completedText
                          .replace('{date}', formatActivityDate(day.date, locale))
                          .replace('{count}', String(day.count))
                          .replace('{plural}', day.count === 1 ? t.widgets.activityGraph.task : t.widgets.activityGraph.tasks)}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )
              }),
            )}
          </div>
        </div>
      </div>
    )
  }, [weeks, fullGridWidth, fullGridHeight, yearDelimiters, dayLabels, locale, t])

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-foreground">{t.widgets.activityGraph.title}</span>
          <span className="text-xs font-medium text-muted-foreground">
            {isLoading
              ? t.widgets.activityGraph.loading
              : t.widgets.activityGraph.taskCompleted
                .replace('{count}', String(totalCompleted))
                .replace('{plural}', totalPluralLabel)}
          </span>
        </div>
      </div>

      <div ref={measureRef} className="mt-[10px] flex min-h-0 flex-1 flex-col">
        <TooltipProvider delayDuration={50} skipDelayDuration={0} disableHoverableContent>
          {isLoading ? (
            <div className="flex-1 min-h-0 flex items-center justify-center">
              <div className="animate-pulse bg-muted/60 rounded w-full h-24" />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              {/* Month label row, aligned to the grid */}
              <div className="mb-1 flex shrink-0 items-end gap-2">
                <div className="w-7 shrink-0" />
                <div className="relative h-3 flex-1 min-w-0">
                  {monthLabels.map((m) => {
                    const center =
                      m.weekIndex * (CELL_SIZE + CELL_GAP) +
                      (m.weekSpan * (CELL_SIZE + CELL_GAP) - CELL_GAP) / 2
                    // Hide labels that would be clipped at either edge
                    if (gridWidth > 0 && (center < 12 || center > gridWidth - 12)) return null
                    return (
                      <span
                        key={`${m.weekIndex}-${m.label}`}
                        className={`absolute uppercase -translate-x-1/2 ${MICRO_META_CLASS}`}
                        style={{ left: `${center}px` }}
                      >
                        {m.label}
                      </span>
                    )
                  })}
                </div>
              </div>

          {/* Day labels + grid (with year delimiters) */}
          {gridBlock}
          {/* Legend */}
          <div className="mt-5 flex shrink-0 items-center justify-end gap-1.5 text-[10px] font-medium text-muted-foreground">
            <span>{t.widgets.activityGraph.less}</span>
            <div className="size-2.5 rounded-[2px] bg-muted/60" />
            <div className="size-2.5 rounded-[2px] bg-primary/30" />
            <div className="size-2.5 rounded-[2px] bg-primary/55" />
            <div className="size-2.5 rounded-[2px] bg-primary/80" />
            <div className="size-2.5 rounded-[2px] bg-primary" />
            <span>{t.widgets.activityGraph.more}</span>
          </div>
        </div>
      )}
    </TooltipProvider>
  </div>
  </div>
  )
}
