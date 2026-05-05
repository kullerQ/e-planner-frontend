'use client'
import type { CSSProperties, ReactNode } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { DragDropVerticalIcon, Cancel01Icon } from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import { messages } from '@/lib/messages'
import { useDashboardStore } from '@/stores/useDashboardStore'
import type { WidgetPlacement } from '@/types'

interface WidgetShellProps {
  placement: WidgetPlacement
  style?: CSSProperties
  isDragging?: boolean
  children: ReactNode
  dragHandleProps?: Record<string, unknown>
  variant?: 'default' | 'phrase'
}

export function WidgetShell({
  placement,
  style,
  isDragging = false,
  children,
  dragHandleProps,
  variant = 'default',
}: WidgetShellProps) {
  const isEditMode = useDashboardStore((s) => s.isEditMode)
  const removeWidget = useDashboardStore((s) => s.removeWidget)

  return (
    <div
      style={style}
      className={cn(
        'group/shell relative overflow-hidden rounded-xl p-5 transition-all duration-200',
        isEditMode
          ? 'border border-dashed border-border backdrop-blur-sm'
          : 'backdrop-blur-sm border border-border/50 hover:border-border shadow-sm hover:shadow-md',
        variant === 'phrase'
          ? 'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent'
          : 'bg-card/70',
        isDragging && 'shadow-2xl scale-[1.02] opacity-95 z-50 ring-2 ring-primary/40'
      )}
    >
      {isEditMode && (
        <div className="absolute top-0 right-0 flex items-center gap-0.5 rounded-bl-lg bg-card/80 backdrop-blur-sm border-l border-b border-border/60 px-1.5 py-1 z-10">
          <div
            {...dragHandleProps}
            className="flex h-6 w-6 items-center justify-center cursor-grab active:cursor-grabbing rounded text-muted-foreground/60 hover:bg-muted/60 hover:text-foreground transition-colors"
            aria-label={messages.widgets.shell.dragWidget}
            role="button"
          >
            <HugeiconsIcon icon={DragDropVerticalIcon} size={14} />
          </div>
          <button
            type="button"
            onClick={() => removeWidget(placement.instanceId)}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors"
            aria-label={messages.widgets.shell.removeWidget}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={13} />
          </button>
        </div>
      )}
      <div className="h-full w-full">{children}</div>
    </div>
  )
}
