'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon } from '@hugeicons/core-free-icons'
import { CalendarTaskPill, CalendarTaskBlock } from './CalendarCell'
import { cn } from '@/lib/utils'
import type { Task, TaskGroup } from '@/types'
import type { WeekStartsOn } from '@/lib/preferences'

const TOTAL_MINUTES = 24 * 60
const SLOT_MINUTES = 30
const SLOTS_PER_DAY = TOTAL_MINUTES / SLOT_MINUTES
const TASK_DURATION_MINUTES = 60

interface TaskLayout {
  task: Task
  startMin: number
  stackIndex: number
  groupSize: number
}

function computeTaskLayouts(tasks: Task[]): TaskLayout[] {
  if (tasks.length === 0) return []

  const items = tasks.map((task) => {
    const due = new Date(task.dueDate!)
    const startMin = due.getHours() * 60 + due.getMinutes()
    return { task, startMin, endMin: startMin + TASK_DURATION_MINUTES, stackIndex: 0, groupSize: 1 }
  })

  items.sort((a, b) => a.startMin - b.startMin)

  const groups: (typeof items[number])[][] = []
  let currentGroup: (typeof items[number])[] = []
  let groupEnd = -1

  for (const item of items) {
    if (item.startMin >= groupEnd) {
      if (currentGroup.length > 0) groups.push(currentGroup)
      currentGroup = [item]
      groupEnd = item.endMin
    } else {
      currentGroup.push(item)
      if (item.endMin > groupEnd) groupEnd = item.endMin
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup)

  for (const group of groups) {
    const size = group.length
    group.forEach((item, idx) => {
      item.stackIndex = idx
      item.groupSize = size
    })
  }

  return items
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatTimeLabel(slotIndex: number): string {
  const totalMin = slotIndex * SLOT_MINUTES
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m === 0 ? `${h.toString().padStart(2, '0')}:00` : ''
}

function getWeekDates(date: Date, weekStartsOn: WeekStartsOn): Date[] {
  const day = date.getDay()
  const diff = (day - weekStartsOn + 7) % 7
  const start = new Date(date)
  start.setDate(date.getDate() - diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function getMonthDays(date: Date, weekStartsOn: WeekStartsOn): { date: Date; inMonth: boolean }[] {
  const year = date.getFullYear()
  const month = date.getMonth()
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
}

function getTasksForDate(tasks: Task[], date: Date, hiddenGroupIds: Set<string>): Task[] {
  return tasks.filter((t) => {
    if (!t.dueDate) return false
    if (t.isDeleted) return false
    if (t.groupId && hiddenGroupIds.has(t.groupId)) return false
    return isSameDay(new Date(t.dueDate), date)
  })
}

function getGroupMap(groups: TaskGroup[]): Map<string, TaskGroup> {
  return new Map(groups.map((g) => [g.id, g]))
}

const DAY_SHORT_NAMES_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_SHORT_NAMES_SUN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface TimeGridProps {
  dates: Date[]
  tasks: Task[]
  groupMap: Map<string, TaskGroup>
  hiddenGroupIds: Set<string>
  weekStartsOn: WeekStartsOn
  todayFlash: boolean
  onClickSlot: (date: Date, slotIndex: number) => void
  onTaskClick: (taskId: string) => void
}

function TimeGrid({
  dates,
  tasks,
  groupMap,
  hiddenGroupIds,
  weekStartsOn,
  todayFlash,
  onClickSlot,
  onTaskClick,
}: TimeGridProps) {
  const today = useMemo(() => new Date(), [])
  const [currentMinutes, setCurrentMinutes] = useState<number>(() => {
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes()
  })
  const [hoveredSlot, setHoveredSlot] = useState<{ colIdx: number; slotIdx: number } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const dayNames = weekStartsOn === 0 ? DAY_SHORT_NAMES_SUN : DAY_SHORT_NAMES_MON

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes())
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (gridRef.current) {
      const scrollPos = (currentMinutes / TOTAL_MINUTES) * gridRef.current.scrollHeight
      gridRef.current.scrollTop = scrollPos - gridRef.current.clientHeight / 2
    }
  }, [])

  const todayColumnIndex = useMemo(
    () => dates.findIndex((d) => isSameDay(d, today)),
    [dates, today]
  )

  const tasksByDate = useMemo(
    () => dates.map((date) => getTasksForDate(tasks, date, hiddenGroupIds)),
    [dates, tasks, hiddenGroupIds]
  )

  const slots = Array.from({ length: SLOTS_PER_DAY }, (_, i) => i)

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Column headers */}
      <div
        className="grid border-b border-border/50 flex-shrink-0"
        style={{ gridTemplateColumns: `4rem repeat(${dates.length}, 1fr)` }}
      >
        <div className="border-r border-border/30" />
        {dates.map((date, i) => {
          const isToday = i === todayColumnIndex
          const dayIndex = (date.getDay() - (weekStartsOn === 0 ? 0 : 1) + 7) % 7
          const dayName = dayNames[dayIndex] ?? ''
          return (
            <div
              key={date.toISOString()}
              className={cn(
                'py-2 text-center border-r border-border/30',
                isToday && todayFlash && 'bg-primary/20 transition-colors duration-700'
              )}
            >
              <div className={cn('text-xs uppercase', isToday ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                {dayName}
              </div>
              <div
                className={cn(
                  'mx-auto mt-0.5 flex items-center justify-center size-7 rounded-full text-sm font-medium',
                  isToday && 'bg-primary text-primary-foreground'
                )}
              >
                {date.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Time grid body */}
      <div className="flex-1 overflow-y-auto relative min-h-0" ref={gridRef}>
        <div
          className="grid relative h-[2304px]"
          style={{ gridTemplateColumns: `4rem repeat(${dates.length}, 1fr)` }}
        >
          {/* Time labels column */}
          <div className="flex flex-col border-r border-border/30">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="h-24 border-b border-border/20 flex items-center justify-end pr-2">
                <span className="text-xs text-muted-foreground">{`${h.toString().padStart(2, '0')}:00`}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {dates.map((date, colIdx) => {
            const isToday = colIdx === todayColumnIndex
            const dayTasks = tasksByDate[colIdx] ?? []

            return (
              <div key={date.toISOString()} className="relative border-r border-border/30">
                {/* Slot rows */}
                {slots.map((slotIdx) => (
                  <div
                    key={slotIdx}
                    className={cn(
                      'h-12 border-b border-border/20 cursor-pointer hover:bg-accent/20 transition-colors',
                      isToday && 'bg-primary/5'
                    )}
                    onClick={() => onClickSlot(date, slotIdx)}
                    onMouseEnter={() => setHoveredSlot({ colIdx, slotIdx })}
                    onMouseLeave={() => setHoveredSlot(null)}
                  />
                ))}

                {/* Current time indicator */}
                {isToday && (
                  <div
                    className="absolute left-0 right-0 pointer-events-none z-20"
                    style={{ top: `${(currentMinutes / TOTAL_MINUTES) * 100}%` }}
                  >
                    <div className="relative flex items-center">
                      <div className="size-2 rounded-full bg-primary flex-shrink-0 -translate-x-1" />
                      <div className="flex-1 border-t-2 border-primary" />
                    </div>
                  </div>
                )}

                {/* Task blocks */}
                <div className="absolute inset-0 pointer-events-none z-10">
                  <div className="relative h-full">
                    {computeTaskLayouts(dayTasks).map((layout) => {
                      const group = layout.task.groupId ? (groupMap.get(layout.task.groupId) ?? null) : null

                      return (
                        <CalendarTaskBlock
                          key={layout.task.id}
                          task={layout.task}
                          group={group}
                          totalMinutes={TOTAL_MINUTES}
                          durationMinutes={TASK_DURATION_MINUTES}
                          startMinutes={layout.startMin}
                          stackIndex={layout.stackIndex}
                          groupSize={layout.groupSize}
                          onClick={() => onTaskClick(layout.task.id)}
                        />
                      )
                    })}
                  </div>
                </div>

                {/* Hover + icon: rendered above task blocks, pointer-events-none */}
                {hoveredSlot?.colIdx === colIdx && (
                  <div
                    className="absolute left-0 right-0 pointer-events-none z-30 flex items-center justify-center"
                    style={{ top: `${hoveredSlot.slotIdx * 48}px`, height: '48px' }}
                  >
                    <HugeiconsIcon icon={Add01Icon} size={16} className="text-muted-foreground" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface MonthGridProps {
  date: Date
  tasks: Task[]
  groupMap: Map<string, TaskGroup>
  hiddenGroupIds: Set<string>
  weekStartsOn: WeekStartsOn
  todayFlash: boolean
  onClickCell: (date: Date) => void
  onTaskClick: (taskId: string) => void
}

function MonthGrid({
  date,
  tasks,
  groupMap,
  hiddenGroupIds,
  weekStartsOn,
  todayFlash,
  onClickCell,
  onTaskClick,
}: MonthGridProps) {
  const today = useMemo(() => new Date(), [])
  const dayNames = weekStartsOn === 0 ? DAY_SHORT_NAMES_SUN : DAY_SHORT_NAMES_MON

  const days = useMemo(() => getMonthDays(date, weekStartsOn), [date, weekStartsOn])

  const weeks = useMemo(() => {
    const result: { date: Date; inMonth: boolean }[][] = []
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7))
    }
    return result
  }, [days])

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      {/* Headers */}
      <div className="grid grid-cols-7 border-b border-border/50 flex-shrink-0">
        {dayNames.map((name, i) => (
          <div key={i} className="py-2 text-center text-xs text-muted-foreground uppercase border-r border-border/30 last:border-r-0">
            {name}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 flex-1 border-b border-border/20">
          {week.map(({ date: cellDate, inMonth }) => {
            const isToday = isSameDay(cellDate, today)
            const cellTasks = getTasksForDate(tasks, cellDate, hiddenGroupIds)
            const visibleTasks = cellTasks.slice(0, 3)
            const overflowCount = cellTasks.length - visibleTasks.length

            return (
              <div
                key={cellDate.toISOString()}
                className={cn(
                  'group border-r border-border/30 last:border-r-0 p-1 min-h-[100px] cursor-pointer relative',
                  'hover:bg-accent/20 transition-colors',
                  isToday && todayFlash && 'bg-primary/10 transition-colors duration-700'
                )}
                onClick={() => onClickCell(cellDate)}
              >
                <div
                  className={cn(
                    'flex items-center justify-center size-7 rounded-full text-sm mb-1',
                    inMonth ? 'text-foreground' : 'text-muted-foreground/40',
                    isToday && 'bg-primary text-primary-foreground font-semibold'
                  )}
                >
                  {cellDate.getDate()}
                </div>
                {cellTasks.length === 0 && (
                  <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <HugeiconsIcon icon={Add01Icon} size={20} className="text-muted-foreground" />
                  </span>
                )}

                <div className="flex flex-col gap-0.5">
                  {visibleTasks.map((task) => {
                    const group = task.groupId ? (groupMap.get(task.groupId) ?? null) : null
                    return (
                      <CalendarTaskPill
                        key={task.id}
                        task={task}
                        group={group}
                        onClick={() => onTaskClick(task.id)}
                      />
                    )
                  })}
                  {overflowCount > 0 && (
                    <span className="text-xs text-muted-foreground px-1">+{overflowCount} more</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

interface DayGridProps {
  date: Date
  tasks: Task[]
  groupMap: Map<string, TaskGroup>
  hiddenGroupIds: Set<string>
  onClickSlot: (date: Date, slotIndex: number) => void
  onTaskClick: (taskId: string) => void
}

function DayGrid({ date, tasks, groupMap, hiddenGroupIds, onClickSlot, onTaskClick }: DayGridProps) {
  const [currentMinutes, setCurrentMinutes] = useState<number>(() => {
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes()
  })
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null)
  const today = useMemo(() => new Date(), [])
  const isToday = isSameDay(date, today)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes())
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll to current time on mount for today
  useEffect(() => {
    if (isToday && gridRef.current) {
      const scrollPos = (currentMinutes / TOTAL_MINUTES) * gridRef.current.scrollHeight
      gridRef.current.scrollTop = scrollPos - gridRef.current.clientHeight / 2
    }
  }, [isToday])

  const dayTasks = useMemo(
    () => getTasksForDate(tasks, date, hiddenGroupIds),
    [tasks, date, hiddenGroupIds]
  )

  const slots = Array.from({ length: SLOTS_PER_DAY }, (_, i) => i)

  return (
    <div className="flex flex-col flex-1 overflow-y-auto min-h-0" ref={gridRef}>
      <div className="grid relative h-[2304px] min-h-0" style={{ gridTemplateColumns: '4rem 1fr' }}>
        {/* Time labels */}
        <div className="flex flex-col border-r border-border/30">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="h-24 border-b border-border/20 flex items-center justify-end pr-2">
              <span className="text-xs text-muted-foreground">{`${h.toString().padStart(2, '0')}:00`}</span>
            </div>
          ))}
        </div>

        {/* Day column */}
        <div className="relative">
          {slots.map((slotIdx) => (
            <div
              key={slotIdx}
              className={cn(
                'h-12 border-b border-border/20 cursor-pointer hover:bg-accent/20 transition-colors',
                isToday && 'bg-primary/5'
              )}
              onClick={() => onClickSlot(date, slotIdx)}
              onMouseEnter={() => setHoveredSlot(slotIdx)}
              onMouseLeave={() => setHoveredSlot(null)}
            />
          ))}

          {/* Current time indicator */}
          {isToday && (
            <div
              className="absolute left-0 right-0 pointer-events-none z-20"
              style={{ top: `${(currentMinutes / TOTAL_MINUTES) * 100}%` }}
            >
              <div className="relative flex items-center">
                <div className="size-2 rounded-full bg-primary flex-shrink-0 -translate-x-1" />
                <div className="flex-1 border-t-2 border-primary" />
              </div>
            </div>
          )}

          {/* Task blocks */}
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="relative h-full">
              {computeTaskLayouts(dayTasks).map((layout) => {
                const group = layout.task.groupId ? (groupMap.get(layout.task.groupId) ?? null) : null

                return (
                  <CalendarTaskBlock
                    key={layout.task.id}
                    task={layout.task}
                    group={group}
                    totalMinutes={TOTAL_MINUTES}
                    durationMinutes={TASK_DURATION_MINUTES}
                    startMinutes={layout.startMin}
                    stackIndex={layout.stackIndex}
                    groupSize={layout.groupSize}
                    onClick={() => onTaskClick(layout.task.id)}
                  />
                )
              })}
            </div>
          </div>

          {/* Hover + icon: above task blocks, pointer-events-none */}
          {hoveredSlot !== null && (
            <div
              className="absolute left-0 right-0 pointer-events-none z-30 flex items-center justify-center"
              style={{ top: `${hoveredSlot * 48}px`, height: '48px' }}
            >
              <HugeiconsIcon icon={Add01Icon} size={16} className="text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export interface CalendarGridProps {
  tasks: Task[]
  groups: TaskGroup[]
  hiddenGroupIds: Set<string>
  calendarView: 'day' | 'week' | 'month'
  currentDate: Date
  weekStartsOn: WeekStartsOn
  todayFlash: boolean
  onClickSlot: (date: Date, slotIndex?: number) => void
  onTaskClick: (taskId: string) => void
}

export function CalendarGrid({
  tasks,
  groups,
  hiddenGroupIds,
  calendarView,
  currentDate,
  weekStartsOn,
  todayFlash,
  onClickSlot,
  onTaskClick,
}: CalendarGridProps) {
  const groupMap = useMemo(() => getGroupMap(groups), [groups])

  const weekDates = useMemo(
    () => getWeekDates(currentDate, weekStartsOn),
    [currentDate, weekStartsOn]
  )

  const handleClickSlot = useCallback(
    (date: Date, slotIndex?: number) => onClickSlot(date, slotIndex),
    [onClickSlot]
  )

  if (calendarView === 'month') {
    return (
      <MonthGrid
        date={currentDate}
        tasks={tasks}
        groupMap={groupMap}
        hiddenGroupIds={hiddenGroupIds}
        weekStartsOn={weekStartsOn}
        todayFlash={todayFlash}
        onClickCell={(date) => handleClickSlot(date)}
        onTaskClick={onTaskClick}
      />
    )
  }

  if (calendarView === 'day') {
    return (
      <DayGrid
        date={currentDate}
        tasks={tasks}
        groupMap={groupMap}
        hiddenGroupIds={hiddenGroupIds}
        onClickSlot={handleClickSlot}
        onTaskClick={onTaskClick}
      />
    )
  }

  return (
    <TimeGrid
      dates={weekDates}
      tasks={tasks}
      groupMap={groupMap}
      hiddenGroupIds={hiddenGroupIds}
      weekStartsOn={weekStartsOn}
      todayFlash={todayFlash}
      onClickSlot={handleClickSlot}
      onTaskClick={onTaskClick}
    />
  )
}
