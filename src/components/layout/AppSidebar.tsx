'use client'

import { useSyncExternalStore } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Calendar03Icon,
  Delete02Icon,
  Folder01Icon,
  Home01Icon,
  ListViewIcon,
  PlusSignIcon,
  SidebarLeft01Icon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/messages'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useSidebarStore } from '@/hooks/useSidebarState'
import { useIsMounted } from '@/hooks/useIsMounted'
import { SidebarNav, type SidebarNavItemConfig } from './SidebarNav'
import { UserZone } from './UserZone'
import { useTaskSheetStore } from '@/stores/useTaskSheetStore'
import type { User } from '@/types'

interface AppSidebarProps {
  user: User | null
}

function subscribeDesktopMq(onStoreChange: () => void): () => void {
  const mq = window.matchMedia('(min-width: 1024px)')
  mq.addEventListener('change', onStoreChange)
  return () => mq.removeEventListener('change', onStoreChange)
}

function getDesktopMqSnapshot(): boolean {
  return window.matchMedia('(min-width: 1024px)').matches
}

function getDesktopMqServerSnapshot(): boolean {
  return false
}

export function AppSidebar({ user }: AppSidebarProps) {
  const { t } = useI18n()
  const isMounted = useIsMounted()
  const collapsed = useSidebarStore((state) => state.collapsed)
  const toggle = useSidebarStore((state) => state.toggle)
  const openNewTaskSheet = useTaskSheetStore((state) => state.open)
  const isDesktop = useSyncExternalStore(
    subscribeDesktopMq,
    getDesktopMqSnapshot,
    getDesktopMqServerSnapshot
  )

  const effectiveCollapsed = isMounted && collapsed && isDesktop

  const PRIMARY_ITEMS: SidebarNavItemConfig[] = [
    {
      href: '/dashboard',
      label: t.dashboard.nav.dashboard,
      icon: <HugeiconsIcon icon={Home01Icon} strokeWidth={1.5} size={20} />,
    },
    {
      href: '/dashboard/tasks',
      label: t.dashboard.nav.list,
      icon: <HugeiconsIcon icon={ListViewIcon} strokeWidth={1.5} size={20} />,
    },
    {
      href: '/dashboard/calendar',
      label: t.dashboard.nav.calendar,
      icon: <HugeiconsIcon icon={Calendar03Icon} strokeWidth={1.5} size={20} />,
    },
    {
      href: '/dashboard/folders',
      label: t.dashboard.nav.folders,
      icon: <HugeiconsIcon icon={Folder01Icon} strokeWidth={1.5} size={20} />,
    },
  ]

  const RECYCLE_ITEM: SidebarNavItemConfig[] = [
    {
      href: '/dashboard/recycle-bin',
      label: t.dashboard.nav.recycleBin,
      icon: <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.5} size={20} />,
    },
  ]

  const toggleButton = (
    <button
      type="button"
      onClick={() => {
        if (!isMounted || !isDesktop) {
          return
        }
        toggle()
      }}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      aria-label={effectiveCollapsed ? t.dashboard.sidebar.expand : t.dashboard.sidebar.collapse}
      aria-disabled={!isMounted || !isDesktop}
    >
      <HugeiconsIcon icon={SidebarLeft01Icon} strokeWidth={1.5} size={16} />
    </button>
  )

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'h-full shrink-0 border-r border-border/50 bg-background',
          'flex flex-col overflow-hidden',
          'motion-safe:transition-[width] motion-safe:duration-150 motion-safe:ease-out motion-reduce:transition-none',
          effectiveCollapsed
            ? 'w-[56px] md:w-[200px] lg:w-[56px]'
            : 'w-[240px] md:w-[200px] lg:w-[240px]'
        )}
      >
        <div
          className={cn(
            'flex min-h-14 items-center border-b border-border/40 py-2',
            effectiveCollapsed ? 'justify-center px-1' : 'justify-between px-4'
          )}
        >
          <p
            className={cn(
              'overflow-hidden whitespace-nowrap text-sm font-semibold text-foreground',
              'motion-safe:transition-[opacity,max-width] motion-safe:duration-150 motion-safe:ease-out motion-reduce:transition-none',
              effectiveCollapsed ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-full opacity-100'
            )}
          >
            E-Planner
          </p>
          {effectiveCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>{toggleButton}</TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {t.dashboard.sidebar.expand}
              </TooltipContent>
            </Tooltip>
          ) : (
            toggleButton
          )}
        </div>

        <SidebarNav items={PRIMARY_ITEMS} collapsed={effectiveCollapsed} />

        <div className="flex-1" />

        <div
          className={cn(
            'border-t border-border/40 px-2 py-2',
            effectiveCollapsed ? 'flex justify-center' : undefined
          )}
        >
          {effectiveCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    openNewTaskSheet(null)
                  }}
                  className={cn(
                    'inline-flex min-h-11 min-w-11 items-center justify-center rounded-md',
                    'bg-primary text-primary-foreground shadow-sm transition-colors duration-200 ease-out',
                    'hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
                  )}
                  aria-label={t.dashboard.nav.newTask}
                >
                  <HugeiconsIcon icon={PlusSignIcon} strokeWidth={1.5} size={20} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {t.dashboard.nav.newTask}
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={() => {
                openNewTaskSheet(null)
              }}
              className={cn(
                'flex w-full min-h-11 items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium',
                'bg-primary text-primary-foreground shadow-sm transition-colors duration-200 ease-out',
                'hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
              )}
            >
              <span className="shrink-0">
                <HugeiconsIcon icon={PlusSignIcon} strokeWidth={1.5} size={20} />
              </span>
              <span className="truncate text-left">{t.dashboard.nav.newTask}</span>
            </button>
          )}
        </div>

        <SidebarNav
          items={RECYCLE_ITEM}
          collapsed={effectiveCollapsed}
          className="border-t border-border/40 py-2"
        />

        <div className="border-t border-border/40">
          <UserZone collapsed={effectiveCollapsed} user={user} />
        </div>
      </aside>
    </TooltipProvider>
  )
}
