'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Clock01Icon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'

type Field = 'hours' | 'minutes'

export interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  minValue?: string | undefined
  className?: string
  'aria-label'?: string
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) {
    return min
  }
  return Math.max(min, Math.min(max, n))
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function parseTime(value: string): { h: number; m: number } {
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(value)
  if (!match) {
    return { h: 0, m: 0 }
  }
  return {
    h: clamp(Number(match[1]), 0, 23),
    m: clamp(Number(match[2]), 0, 59),
  }
}

export function TimePicker({
  value,
  onChange,
  minValue,
  className,
  'aria-label': ariaLabel,
}: TimePickerProps) {
  const { h, m } = parseTime(value)
  const minTime = minValue ? parseTime(minValue) : null
  const minTotalMinutes = minTime ? minTime.h * 60 + minTime.m : null
  const minHours = minTime?.h ?? 0
  const minMinutes = minTime?.m ?? 0
  const [hoursDraft, setHoursDraft] = React.useState(pad(h))
  const [minutesDraft, setMinutesDraft] = React.useState(pad(m))
  const [activeField, setActiveField] = React.useState<Field>('hours')
  const hoursRef = React.useRef<HTMLInputElement>(null)
  const minutesRef = React.useRef<HTMLInputElement>(null)
  const hoursFocused = React.useRef(false)
  const minutesFocused = React.useRef(false)

  React.useEffect(() => {
    if (!hoursFocused.current) {
      setHoursDraft(pad(h))
    }
  }, [h])

  React.useEffect(() => {
    if (!minutesFocused.current) {
      setMinutesDraft(pad(m))
    }
  }, [m])

  const commit = React.useCallback(
    (nextH: number, nextM: number) => {
      if (minTotalMinutes === null) {
        onChange(`${pad(nextH)}:${pad(nextM)}`)
        return
      }
      const nextTotal = nextH * 60 + nextM
      if (nextTotal >= minTotalMinutes) {
        onChange(`${pad(nextH)}:${pad(nextM)}`)
        return
      }
      onChange(`${pad(minHours)}:${pad(minMinutes)}`)
    },
    [minHours, minMinutes, minTotalMinutes, onChange]
  )

  const step = (delta: number) => {
    if (activeField === 'hours') {
      commit((h + delta + 24) % 24, m)
    } else {
      commit(h, (m + delta + 60) % 60)
    }
  }

  const focusMinutes = () => {
    minutesRef.current?.focus()
    minutesRef.current?.select()
  }

  const focusHours = () => {
    hoursRef.current?.focus()
    hoursRef.current?.select()
  }

  const onHoursKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      commit((h + 1) % 24, m)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      commit((h + 23) % 24, m)
    } else if (event.key === 'ArrowRight' || event.key === ':') {
      event.preventDefault()
      focusMinutes()
    }
  }

  const onMinutesKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      commit(h, (m + 1) % 60)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      commit(h, (m + 59) % 60)
    } else if (
      event.key === 'ArrowLeft' &&
      (event.currentTarget.selectionStart ?? 0) === 0
    ) {
      event.preventDefault()
      focusHours()
    } else if (
      event.key === 'Backspace' &&
      event.currentTarget.value === ''
    ) {
      event.preventDefault()
      focusHours()
    }
  }

  const onHoursChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.replace(/[^0-9]/g, '').slice(0, 2)
    setHoursDraft(raw)
    if (raw === '') {
      return
    }
    const parsed = clamp(Number(raw), 0, 23)
    commit(parsed, m)
    if (raw.length === 2) {
      focusMinutes()
    }
  }

  const onMinutesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.replace(/[^0-9]/g, '').slice(0, 2)
    setMinutesDraft(raw)
    if (raw === '') {
      return
    }
    const parsed = clamp(Number(raw), 0, 59)
    commit(h, parsed)
  }

  const onHoursBlur = () => {
    setHoursDraft(pad(h))
  }
  const onMinutesBlur = () => {
    setMinutesDraft(pad(m))
  }

  const inputClass = cn(
    'w-7 bg-transparent text-center text-sm font-medium tabular-nums outline-none',
    'rounded-sm focus:bg-accent focus:text-accent-foreground',
    'selection:bg-primary selection:text-primary-foreground'
  )

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-2 rounded-md border border-input bg-background pl-2.5 pr-1 py-1 transition-colors',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:border-transparent',
        className
      )}
    >
      <HugeiconsIcon
        icon={Clock01Icon}
        size={14}
        className="shrink-0 text-muted-foreground"
      />
      <div className="flex items-center">
        <input
          ref={hoursRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label="Hours"
          value={hoursDraft}
          maxLength={2}
          onChange={onHoursChange}
          onFocus={(event) => {
            hoursFocused.current = true
            setActiveField('hours')
            event.currentTarget.select()
          }}
          onKeyDown={onHoursKeyDown}
          onBlur={(event) => {
            hoursFocused.current = false
            onHoursBlur()
          }}
          className={inputClass}
        />
        <span className="px-0.5 text-sm text-muted-foreground">:</span>
        <input
          ref={minutesRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label="Minutes"
          value={minutesDraft}
          maxLength={2}
          onChange={onMinutesChange}
          onFocus={(event) => {
            minutesFocused.current = true
            setActiveField('minutes')
            event.currentTarget.select()
          }}
          onKeyDown={onMinutesKeyDown}
          onBlur={(event) => {
            minutesFocused.current = false
            onMinutesBlur()
          }}
          className={inputClass}
        />
      </div>
      <div className="ml-auto flex flex-col">
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Increment ${activeField}`}
          onMouseDown={(event) => {
            event.preventDefault()
          }}
          onClick={() => {
            step(1)
          }}
          className="inline-flex h-3.5 w-5 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <HugeiconsIcon icon={ArrowUp01Icon} size={10} />
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Decrement ${activeField}`}
          onMouseDown={(event) => {
            event.preventDefault()
          }}
          onClick={() => {
            step(-1)
          }}
          className="inline-flex h-3.5 w-5 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <HugeiconsIcon icon={ArrowDown01Icon} size={10} />
        </button>
      </div>
    </div>
  )
}
