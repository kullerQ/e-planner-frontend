'use client'
import { useState } from 'react'
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { HugeiconsIcon } from '@hugeicons/react'
import { DashboardSquare01Icon, PlusSignIcon, Tick01Icon } from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { WidgetShell } from '@/components/dashboard/WidgetShell'
import { ClockWidget } from '@/components/dashboard/widgets/ClockWidget'
import { DailyPhraseWidget } from '@/components/dashboard/widgets/DailyPhraseWidget'
import { MonthCalendarWidget } from '@/components/dashboard/widgets/MonthCalendarWidget'
import { TodaysTasksWidget } from '@/components/dashboard/widgets/TodaysTasksWidget'
import { ActivityGraphWidget } from '@/components/dashboard/widgets/ActivityGraphWidget'
import type { WidgetPlacement, Task } from '@/types'
import type { ActivityEntry } from '@/app/dashboard/page'

interface WidgetRenderArgs {
  tasks: Task[]
  phrase: string | undefined
  attribution: string | undefined
  activityData: ActivityEntry[]
  onStatusUpdated: ((taskId: string, newStatus: Task['status']) => void) | undefined
  onTaskDeleted: ((taskId: string) => void) | undefined
  onTaskRestored: ((taskId: string) => void) | undefined
  onRefresh: (() => void) | undefined
}

const WIDGET_VARIANTS: Record<string, 'default' | 'phrase'> = {
  'daily-phrase': 'phrase',
}

const WIDGET_RENDERERS: Record<string, (args: WidgetRenderArgs) => React.ReactNode> = {
  clock: () => <ClockWidget />,
  'daily-phrase': ({ phrase, attribution }) => <DailyPhraseWidget {...(phrase !== undefined ? { phrase } : {})} {...(attribution !== undefined ? { attribution } : {})} />,
  'month-calendar': ({ tasks }) => <MonthCalendarWidget tasks={tasks} />,
  'todays-tasks': ({ tasks, onStatusUpdated, onTaskDeleted, onTaskRestored, onRefresh }) => <TodaysTasksWidget tasks={tasks} onStatusUpdated={onStatusUpdated} onTaskDeleted={onTaskDeleted} onTaskRestored={onTaskRestored} onRefresh={onRefresh} />,
  'activity-graph': ({ activityData }) => <ActivityGraphWidget activityData={activityData} />,
}

interface DraggableWidgetProps {
  placement: WidgetPlacement
  tasks: Task[]
  phrase: string | undefined
  attribution: string | undefined
  activityData: ActivityEntry[]
  activeDragId: string | null
  onStatusUpdated: ((taskId: string, newStatus: Task['status']) => void) | undefined
  onTaskDeleted: ((taskId: string) => void) | undefined
  onTaskRestored: ((taskId: string) => void) | undefined
  onRefresh: (() => void) | undefined
}

function DraggableWidget({ placement, tasks, phrase, attribution, activityData, activeDragId, onStatusUpdated, onTaskDeleted, onTaskRestored, onRefresh }: DraggableWidgetProps) {
  const isEditMode = useDashboardStore((s) => s.isEditMode)
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: placement.instanceId,
    disabled: !isEditMode,
  })

  const isDragging = activeDragId === placement.instanceId

  const style: React.CSSProperties = {
    gridColumn: `${placement.colStart} / ${placement.colEnd}`,
    gridRow: `${placement.rowStart} / ${placement.rowEnd}`,
    ...(transform
      ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
      : {}),
  }

  const renderWidget = WIDGET_RENDERERS[placement.widgetId]
  if (!renderWidget) return null

  return (
    <div ref={setNodeRef} style={style}>
      <WidgetShell
        placement={placement}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
        style={{ height: '100%' }}
        variant={WIDGET_VARIANTS[placement.widgetId] ?? 'default'}
      >
        {renderWidget({ tasks, phrase, attribution, activityData, onStatusUpdated, onTaskDeleted, onTaskRestored, onRefresh })}
      </WidgetShell>
    </div>
  )
}

interface WidgetCanvasProps {
  tasks: Task[] | undefined
  phrase: string | undefined
  attribution: string | undefined
  activityData: ActivityEntry[]
  onStatusUpdated: ((taskId: string, newStatus: Task['status']) => void) | undefined
  onTaskDeleted: ((taskId: string) => void) | undefined
  onTaskRestored: ((taskId: string) => void) | undefined
  onRefresh: (() => void) | undefined
}

export function WidgetCanvas({ tasks = [], phrase, attribution, activityData, onStatusUpdated, onTaskDeleted, onTaskRestored, onRefresh }: WidgetCanvasProps) {
  const layout = useDashboardStore((s) => s.layout)
  const isEditMode = useDashboardStore((s) => s.isEditMode)
  const setLayout = useDashboardStore((s) => s.setLayout)
  const enterEditMode = useDashboardStore((s) => s.enterEditMode)
  const exitEditMode = useDashboardStore((s) => s.exitEditMode)

  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeIdx = layout.findIndex((p) => p.instanceId === active.id)
    const overIdx = layout.findIndex((p) => p.instanceId === over.id)
    if (activeIdx === -1 || overIdx === -1) return

    const activePlacement = layout[activeIdx]!
    const overPlacement = layout[overIdx]!

    const newLayout = layout.map((p, i) => {
      if (i === activeIdx) {
        return {
          ...p,
          colStart: overPlacement.colStart,
          colEnd: overPlacement.colEnd,
          rowStart: overPlacement.rowStart,
          rowEnd: overPlacement.rowEnd,
        }
      }
      if (i === overIdx) {
        return {
          ...p,
          colStart: activePlacement.colStart,
          colEnd: activePlacement.colEnd,
          rowStart: activePlacement.rowStart,
          rowEnd: activePlacement.rowEnd,
        }
      }
      return p
    })
    setLayout(newLayout)
  }

  if (layout.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground py-20">
        <HugeiconsIcon icon={DashboardSquare01Icon} size={36} className="opacity-40" />
        <p className="text-sm">Your dashboard is empty</p>
        {/* Edit Dashboard button - hidden for now
        <button
          onClick={enterEditMode}
          className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          Edit Dashboard
        </button>
        */}
      </div>
    )
  }

  return (
    <div className="relative flex-1">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="grid gap-4 px-6 pb-6"
          style={{
            gridTemplateColumns: 'repeat(12, 1fr)',
            gridAutoRows: '56px',
          }}
        >
          {layout.map((placement) => (
            <DraggableWidget
              key={placement.instanceId}
              placement={placement}
              tasks={tasks}
              phrase={phrase}
              attribution={attribution}
              activityData={activityData}
              activeDragId={activeDragId}
              onStatusUpdated={onStatusUpdated}
              onTaskDeleted={onTaskDeleted}
              onTaskRestored={onTaskRestored}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      </DndContext>

      {isEditMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-popover/95 backdrop-blur-xl border border-border shadow-xl rounded-full pl-2 pr-1 py-1 flex items-center gap-1 z-50">
          <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Editing
          </span>
          <div className="w-px h-5 bg-border/60" />
          <button
            onClick={() => {}}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
              'text-foreground/80 hover:bg-muted/60 hover:text-foreground transition-colors'
            )}
          >
            <HugeiconsIcon icon={PlusSignIcon} size={13} />
            Add Widget
          </button>
          <button
            onClick={exitEditMode}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold',
              'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm'
            )}
          >
            <HugeiconsIcon icon={Tick01Icon} size={13} />
            Done
          </button>
        </div>
      )}
    </div>
  )
}
