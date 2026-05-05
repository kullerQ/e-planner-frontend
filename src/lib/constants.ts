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
  { widgetId: 'clock',          instanceId: 'default-clock',    colStart: 1, colEnd: 4,  rowStart: 1, rowEnd: 3 },
  { widgetId: 'daily-phrase',   instanceId: 'default-phrase',   colStart: 4, colEnd: 9,  rowStart: 1, rowEnd: 3 },
  { widgetId: 'month-calendar', instanceId: 'default-calendar', colStart: 9, colEnd: 13, rowStart: 1, rowEnd: 7 },
  { widgetId: 'activity-graph', instanceId: 'default-activity', colStart: 1, colEnd: 9,  rowStart: 3, rowEnd: 7 },
  { widgetId: 'todays-tasks',   instanceId: 'default-today',    colStart: 1, colEnd: 9,  rowStart: 7, rowEnd: 12 },
]

export interface WidgetRegistryEntry {
  widgetId: string
  label: string
  defaultColSpan: number
  defaultRowSpan: number
}

export const WIDGET_REGISTRY: WidgetRegistryEntry[] = [
  { widgetId: 'clock',          label: 'Clock',          defaultColSpan: 3, defaultRowSpan: 1 },
  { widgetId: 'daily-phrase',   label: 'Daily Phrase',   defaultColSpan: 4, defaultRowSpan: 1 },
  { widgetId: 'month-calendar', label: 'Month Calendar', defaultColSpan: 5, defaultRowSpan: 2 },
  { widgetId: 'activity-graph', label: 'Activity Graph', defaultColSpan: 7, defaultRowSpan: 1 },
  { widgetId: 'todays-tasks',   label: "Today's Tasks",  defaultColSpan: 6, defaultRowSpan: 2 },
]
