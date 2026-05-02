import type { TaskPriority, WidgetPlacement } from '@/types'

export const GROUP_COLOR_PALETTE: string[] = [
  '#4ade80', '#60a5fa', '#f472b6', '#fb923c', '#a78bfa',
  '#34d399', '#facc15', '#f87171', '#38bdf8', '#c084fc',
]

// Priority UI is intentionally disabled for now.
// Keep this stub so the feature can be restored quickly.
export const PRIORITY_UI_STUB: Record<TaskPriority, null> = {
  critical: null,
  high: null,
  medium: null,
  low: null,
  none: null,
}

export const DEFAULT_WIDGET_LAYOUT: WidgetPlacement[] = [
  { widgetId: 'clock', instanceId: 'default-clock', colStart: 1, colEnd: 4, rowStart: 1, rowEnd: 2 },
  { widgetId: 'daily-phrase', instanceId: 'default-phrase', colStart: 4, colEnd: 8, rowStart: 1, rowEnd: 2 },
  { widgetId: 'month-calendar', instanceId: 'default-calendar', colStart: 8, colEnd: 13, rowStart: 1, rowEnd: 3 },
  { widgetId: 'activity-graph', instanceId: 'default-activity', colStart: 1, colEnd: 8, rowStart: 2, rowEnd: 3 },
  { widgetId: 'todays-tasks', instanceId: 'default-today', colStart: 1, colEnd: 7, rowStart: 3, rowEnd: 5 },
]

export const WIDGET_REGISTRY: unknown[] = []
