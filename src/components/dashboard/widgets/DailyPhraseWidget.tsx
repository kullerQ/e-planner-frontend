'use client'
import type { Task } from '@/types'

interface DailyPhraseWidgetProps {
  phrase?: string | undefined
  attribution?: string | undefined
  tasks?: Task[] | undefined
}

export function DailyPhraseWidget({ phrase, attribution }: DailyPhraseWidgetProps) {
  const displayPhrase =
    phrase ?? 'The secret of getting ahead is getting started.'
  const displayAttribution = attribution ?? 'Mark Twain'

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
      <span
        aria-hidden
        className="absolute left-3 top-0 select-none text-6xl leading-none font-serif text-primary/25"
      >
        &ldquo;
      </span>
      <p className="text-sm font-medium italic leading-relaxed text-foreground max-w-[90%] z-10">
        {displayPhrase}
      </p>
      {displayAttribution && (
        <span className="text-xs font-medium uppercase tracking-wider text-primary/80">
          — {displayAttribution}
        </span>
      )}
    </div>
  )
}
