'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/messages'
import {
  ProfileSection,
  AppearanceSection,
  TaskDefaultsSection,
  AccountSection,
} from '@/components/settings'
import type { User } from '@/types'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  UserIcon,
  Image01Icon,
  ClipboardIcon,
  Settings01Icon,
  Logout01Icon,
} from '@hugeicons/core-free-icons'
import { logoutUser } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

type TabId = 'profile' | 'appearance' | 'taskDefaults' | 'account'

interface TabConfig {
  id: TabId
  label: string
  icon: typeof UserIcon
}

interface SettingsTabsProps {
  user: User
}

export function SettingsTabs({ user }: SettingsTabsProps) {
  const { t } = useI18n()
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const TABS = useMemo(
    (): TabConfig[] => [
      {
        id: 'profile',
        label: t.settings.profile,
        icon: UserIcon,
      },
      {
        id: 'appearance',
        label: t.settings.appearance,
        icon: Image01Icon,
      },
      {
        id: 'taskDefaults',
        label: t.settings.taskDefaults,
        icon: ClipboardIcon,
      },
      {
        id: 'account',
        label: t.settings.account,
        icon: Settings01Icon,
      },
    ],
    [t],
  )
  const [activeTab, setActiveTab] = useState<TabId>('profile')
  const handleLogoutConfirm = async () => {
    await logoutUser()
  }

  return (
    <>
      <div className="flex gap-6 px-6 pb-6">
        {/* Left Tab Navigation */}
        <nav className="w-[160px] shrink-0" aria-label={t.dashboard.sidebar.settingsSections}>
          <ul className="space-y-1">
            {TABS.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left',
                    activeTab === tab.id
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  <HugeiconsIcon icon={tab.icon} size={16} />
                  {tab.label}
                </button>
                {/* Logout button under Account tab */}
                {tab.id === 'account' && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsLogoutDialogOpen(true)}
                    className="mt-1 w-full justify-start gap-2 px-3 py-2 h-auto text-sm font-normal text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    <HugeiconsIcon icon={Logout01Icon} size={16} />
                    {t.settings.logout}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Right Content Panel */}
        <div className="flex-1 min-w-0">
          <div className="rounded-lg border border-border/60 bg-card p-6">
            {activeTab === 'profile' ? (
              <ProfileSection user={user} />
            ) : activeTab === 'appearance' ? (
              <AppearanceSection user={user} />
            ) : activeTab === 'taskDefaults' ? (
              <TaskDefaultsSection />
            ) : (
              <AccountSection />
            )}
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={isLogoutDialogOpen}
        onOpenChange={setIsLogoutDialogOpen}
        title={t.settings.logoutTitle}
        description={t.settings.logoutWarning}
        confirmLabel={t.settings.logoutConfirm}
        onConfirm={handleLogoutConfirm}
      />
    </>
  )
}
