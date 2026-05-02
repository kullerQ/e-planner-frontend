'use client'

import { useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Calendar03Icon,
  Delete02Icon,
  Folder01Icon,
  Home01Icon,
  ListViewIcon,
  SidebarLeft01Icon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useSidebarStore } from '@/hooks/useSidebarState'
import { useIsMounted } from '@/hooks/useIsMounted'
import { SidebarNav, type SidebarNavItemConfig } from './SidebarNav'
import { UserZone } from './UserZone'

const PRIMARY_ITEMS: SidebarNavItemConfig[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: <HugeiconsIcon icon={Home01Icon} strokeWidth={1.5} size={20} />,
  },
  {
    href: '/dashboard/tasks',
    label: 'List',
    icon: <HugeiconsIcon icon={ListViewIcon} strokeWidth={1.5} size={20} />,
  },
  {
    href: '/dashboard/calendar',
    label: 'Calendar',
    icon: <HugeiconsIcon icon={Calendar03Icon} strokeWidth={1.5} size={20} />,
  },
  {
    href: '/dashboard/folders',
    label: 'Folders',
    icon: <HugeiconsIcon icon={Folder01Icon} strokeWidth={1.5} size={20} />,
  },
]

const RECYCLE_ITEM: SidebarNavItemConfig[] = [
  {
    href: '/dashboard/recycle-bin',
    label: 'Recycle Bin',
    icon: <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.5} size={20} />,
  },
]

export function AppSidebar() {
  const isMounted = useIsMounted()
  const collapsed = useSidebarStore((state) => state.collapsed)
  const toggle = useSidebarStore((state) => state.toggle)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const handleChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches)

    setIsDesktop(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  const effectiveCollapsed = isMounted && collapsed && isDesktop

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
      aria-label={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-disabled={!isMounted || !isDesktop}
    >
      <HugeiconsIcon icon={SidebarLeft01Icon} strokeWidth={1.5} size={16} />
    </button>
  )

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'h-full shrink-0 border-r border-border/50 bg-background/80 backdrop-blur-md',
          'flex flex-col transition-[width] duration-200 ease-out',
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
              'text-sm font-semibold text-foreground transition-opacity duration-150',
              effectiveCollapsed ? 'pointer-events-none w-0 overflow-hidden opacity-0' : 'w-auto opacity-100'
            )}
          >
            E-Planner
          </p>
          {effectiveCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>{toggleButton}</TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Expand sidebar
              </TooltipContent>
            </Tooltip>
          ) : (
            toggleButton
          )}
        </div>

        <SidebarNav items={PRIMARY_ITEMS} collapsed={effectiveCollapsed} />

        <div className="flex-1" />

        <SidebarNav
          items={RECYCLE_ITEM}
          collapsed={effectiveCollapsed}
          className="border-t border-border/40 py-2"
        />

        <div className="border-t border-border/40">
          <UserZone collapsed={effectiveCollapsed} />
        </div>
      </aside>
    </TooltipProvider>
  )
}
