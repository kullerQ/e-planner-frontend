'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { deleteGroupAndUngroup, deleteGroupWithTasks } from '@/actions/groups'
import { messages } from '@/lib/messages'
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
  const [isPending, setIsPending] = useState(false)
  const [pendingAction, setPendingAction] = useState<'ungroup' | 'delete' | null>(null)

  async function handleUngroup() {
    if (!groupId || isPending) return

    setIsPending(true)
    setPendingAction('ungroup')

    try {
      await deleteGroupAndUngroup(groupId)
      toast.success(messages.dashboard.folders.deletedWithUngroupSuccess)
      onDeleted?.()
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : messages.dashboard.folders.deleteError
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
      toast.success(messages.dashboard.folders.deletedWithTasksSuccess)
      onDeleted?.()
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : messages.dashboard.folders.deleteError
      toast.error(message)
    } finally {
      setIsPending(false)
      setPendingAction(null)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{messages.dashboard.folders.deleteDialog.title.replace('{name}', groupName)}</AlertDialogTitle>
          <AlertDialogDescription>
            {messages.dashboard.folders.deleteDialog.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2 mt-4">
          <Button
            variant="outline"
            onClick={handleUngroup}
            disabled={isPending}
            className="justify-start h-auto py-3 px-4"
          >
            <div className="flex flex-col items-start text-left">
              <span className="font-medium">
                {pendingAction === 'ungroup' ? messages.dashboard.folders.deleteDialog.movingTasks : messages.dashboard.folders.deleteDialog.moveToUngrouped}
              </span>
              <span className="text-xs text-muted-foreground">
                {messages.dashboard.folders.deleteDialog.moveToUngroupedDescription}
              </span>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={handleDeleteWithTasks}
            disabled={isPending}
            className="justify-start h-auto py-3 px-4 border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            <div className="flex flex-col items-start text-left">
              <span className="font-medium text-destructive">
                {pendingAction === 'delete' ? messages.dashboard.folders.deleteDialog.deleting : messages.dashboard.folders.deleteDialog.deleteAllTasks}
              </span>
              <span className="text-xs text-muted-foreground">
                {messages.dashboard.folders.deleteDialog.deleteAllTasksDescription}
              </span>
            </div>
          </Button>
        </div>

        <div className="flex justify-end mt-4">
          <AlertDialogCancel disabled={isPending}>{messages.dashboard.folders.deleteDialog.cancel}</AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
