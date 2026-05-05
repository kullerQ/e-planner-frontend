'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { deleteGroupAndUngroup, deleteGroupWithTasks } from '@/actions/groups'
import { useI18n } from '@/lib/messages'
import { toast } from 'sonner'

interface DeleteGroupDialogProps {
  groupId: string | null
  groupName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function DeleteGroupDialog({
  groupId,
  groupName,
  open,
  onOpenChange,
  onDeleted,
}: DeleteGroupDialogProps) {
  const { t } = useI18n()
  const [isPending, setIsPending] = useState(false)
  const [pendingAction, setPendingAction] = useState<'ungroup' | 'delete' | null>(null)

  async function handleUngroup() {
    if (!groupId || isPending) return

    setIsPending(true)
    setPendingAction('ungroup')

    try {
      await deleteGroupAndUngroup(groupId)
      toast.success(t.dashboard.folders.deletedWithUngroupSuccess)
      onDeleted?.()
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : t.dashboard.folders.deleteError
      toast.error(message)
    } finally {
      setIsPending(false)
      setPendingAction(null)
    }
  }

  async function handleDeleteWithTasks() {
    if (!groupId || isPending) return

    setIsPending(true)
    setPendingAction('delete')

    try {
      await deleteGroupWithTasks(groupId)
      toast.success(t.dashboard.folders.deletedWithTasksSuccess)
      onDeleted?.()
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : t.dashboard.folders.deleteError
      toast.error(message)
    } finally {
      setIsPending(false)
      setPendingAction(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.dashboard.folders.deleteDialog.title.replace('{name}', groupName)}</DialogTitle>
          <DialogDescription>
            {t.dashboard.folders.deleteDialog.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-4">
          <button
            onClick={handleUngroup}
            disabled={isPending}
            className="text-left rounded-lg border border-border bg-card p-4 hover:bg-accent hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col gap-1">
              <span className="font-medium text-foreground">
                {pendingAction === 'ungroup' ? t.dashboard.folders.deleteDialog.movingTasks : t.dashboard.folders.deleteDialog.moveToUngrouped}
              </span>
              <span className="text-sm text-muted-foreground leading-relaxed">
                {t.dashboard.folders.deleteDialog.moveToUngroupedDescription}
              </span>
            </div>
          </button>

          <button
            onClick={handleDeleteWithTasks}
            disabled={isPending}
            className="text-left rounded-lg border border-destructive/30 bg-card p-4 hover:bg-destructive/10 hover:border-destructive/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col gap-1">
              <span className="font-medium text-destructive">
                {pendingAction === 'delete' ? t.dashboard.folders.deleteDialog.deleting : t.dashboard.folders.deleteDialog.deleteAllTasks}
              </span>
              <span className="text-sm text-muted-foreground leading-relaxed">
                {t.dashboard.folders.deleteDialog.deleteAllTasksDescription}
              </span>
            </div>
          </button>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            {t.dashboard.folders.deleteDialog.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
