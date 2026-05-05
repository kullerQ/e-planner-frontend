'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon, Folder01Icon } from '@hugeicons/core-free-icons'
import { FolderBlock } from './FolderBlock'
import { NewFolderBlock } from './NewFolderBlock'
import { DeleteGroupDialog } from '@/components/groups/DeleteGroupDialog'
import { reorderGroups, createGroup, deleteGroupAndUngroup } from '@/actions/groups'
import { useTaskSheetStore } from '@/stores/useTaskSheetStore'
import { useGroupsStore } from '@/stores/useGroupsStore'
import { messages } from '@/lib/messages'
import { cn, randomGroupColor } from '@/lib/utils'
import { toast } from 'sonner'
import type { Task, TaskGroup } from '@/types'

interface FolderCanvasProps {
  groups: TaskGroup[]
  tasks: Task[]
}

// Draft group for inline creation
interface DraftGroup {
  id: string
  name: string
  colorHex: string
  order: number
  taskCount: number
  createdAt: string
  isDraft: true
}

export function FolderCanvas({ groups: initialGroups, tasks: initialTasks }: FolderCanvasProps) {
  const [groups, setGroups] = useState<(TaskGroup | DraftGroup)[]>(initialGroups)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [draftGroup, setDraftGroup] = useState<DraftGroup | null>(null)

  const storeSetGroups = useGroupsStore((s) => s.setGroups)
  const storeAddGroup = useGroupsStore((s) => s.addGroup)
  const storeUpdateGroup = useGroupsStore((s) => s.updateGroup)
  const storeRemoveGroup = useGroupsStore((s) => s.removeGroup)

  useEffect(() => {
    storeSetGroups(initialGroups)
  }, [initialGroups, storeSetGroups])

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null)
  const [deleteGroupName, setDeleteGroupName] = useState('')

  const openTaskSheet = useTaskSheetStore((state) => state.open)

  // Create tasks map by group
  const tasksByGroup = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const group of groups) {
      map.set(group.id, tasks.filter((t) => t.groupId === group.id && !t.isDeleted))
    }
    return map
  }, [groups, tasks])

  // Get ungrouped tasks (tasks with no group)
  const ungroupedTasks = useMemo(
    () => tasks.filter((t) => t.groupId === null && !t.isDeleted),
    [tasks]
  )

  // Combine groups with draft group at the beginning
  const displayGroups = useMemo(
    () => (draftGroup ? [draftGroup, ...groups] : groups),
    [draftGroup, groups]
  )

  const groupIds = useMemo(() => displayGroups.map((g) => g.id), [displayGroups])

  const handleCreateClick = useCallback(() => {
    const newDraft: DraftGroup = {
      id: `draft-${Date.now()}`,
      name: '',
      colorHex: randomGroupColor(),
      order: groups.length,
      taskCount: 0,
      createdAt: new Date().toISOString(),
      isDraft: true,
    }
    setDraftGroup(newDraft)
  }, [groups.length])

  const handleDraftCancel = useCallback(() => {
    setDraftGroup(null)
  }, [])

  const handleDraftCreate = useCallback(async (name: string, colorHex: string) => {
    const trimmedName = name.trim()
    if (trimmedName.length === 0) {
      setDraftGroup(null)
      return
    }

    try {
      const newGroup = await createGroup({
        name: trimmedName,
        colorHex,
      })
      setDraftGroup(null)
      // Add the new group to the start of the list. `groups` is in deps so
      // the closure is always fresh after previous creates/deletes.
      const filtered = groups.filter(
        (g) => g.id !== newGroup.id && !('isDraft' in g)
      ) as TaskGroup[]
      const next: TaskGroup[] = [newGroup, ...filtered]
      setGroups(next)
      storeAddGroup(newGroup)

      // Reorder to persist the new order
      await reorderGroups(next.map((g) => g.id))

      toast.success(messages.dashboard.folders.createdSuccess)
    } catch (error) {
      const message = error instanceof Error ? error.message : messages.dashboard.folders.createError
      toast.error(message)
    }
  }, [groups])

  async function handleDeleteClick(group: TaskGroup) {
    const groupTasks = tasksByGroup.get(group.id) ?? []

    // If group has no tasks, delete immediately without showing dialog
    if (groupTasks.length === 0) {
      try {
        await deleteGroupAndUngroup(group.id)
        setGroups((current) => current.filter((g) => g.id !== group.id))
        storeRemoveGroup(group.id)
        toast.success(messages.dashboard.folders.deletedWithUngroupSuccess)
      } catch (error) {
        const message = error instanceof Error ? error.message : messages.dashboard.folders.deleteError
        toast.error(message)
      }
      return
    }

    // Otherwise, show the delete dialog with options
    setDeleteGroupId(group.id)
    setDeleteGroupName(group.name)
    setDeleteDialogOpen(true)
  }

  function handleGroupDeleted() {
    // Optimistically remove the group from UI
    setGroups((current) => current.filter((g) => g.id !== deleteGroupId))
    if (deleteGroupId) storeRemoveGroup(deleteGroupId)
  }

  function handleOptimisticUpdate(updatedGroup: TaskGroup) {
    setGroups((current) =>
      current.map((g) => (g.id === updatedGroup.id ? updatedGroup : g))
    )
    storeUpdateGroup(updatedGroup)
  }

  function handleTaskMoved(taskId: string, groupId: string | null) {
    setTasks((current) =>
      current.map((t) => (t.id === taskId ? { ...t, groupId } : t))
    )
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = groups.findIndex((g) => g.id === active.id)
      const newIndex = groups.findIndex((g) => g.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        // Reorder locally
        const newGroups = [...groups]
        const [movedItem] = newGroups.splice(oldIndex, 1)
        if (!movedItem) return
        newGroups.splice(newIndex, 0, movedItem)

        // Update order values
        const reorderedGroups = newGroups.map((g, index) => ({
          ...g,
          order: index,
        }))

        setGroups(reorderedGroups)
        storeSetGroups(reorderedGroups as TaskGroup[])

        // Call server action
        try {
          await reorderGroups(reorderedGroups.map((g) => g.id))
        } catch (error) {
          // Revert on error
          setGroups(groups)
          const message = error instanceof Error ? error.message : 'Failed to reorder folders'
          toast.error(message)
        }
      }
    }
  }

  // Empty state
  if (groups.length === 0 && !draftGroup) {
    return (
      <>
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <HugeiconsIcon icon={Folder01Icon} size={40} className="text-muted-foreground/50" />
          <h3 className="text-base font-medium text-foreground">{messages.folders.noFoldersYet}</h3>
          <button
            type="button"
            onClick={handleCreateClick}
            className="text-sm text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-2 py-1"
          >
            {messages.folders.createFirstFolder}
          </button>
        </div>
        <DeleteGroupDialog
          groupId={deleteGroupId}
          groupName={deleteGroupName}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onDeleted={handleGroupDeleted}
        />
      </>
    )
  }

  return (
    <>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={groupIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-6 gap-4">
            {/* Creation button */}
            <button
              type="button"
              onClick={handleCreateClick}
              className={cn(
                'bg-card/90 backdrop-blur-sm border border-border/60 rounded-lg',
                'h-[220px] flex items-center justify-center',
                'hover:bg-accent/50 hover:border-border/80 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              <HugeiconsIcon icon={Add01Icon} size={24} className="text-muted-foreground" />
            </button>

            {/* Folder blocks */}
            {displayGroups.map((group) =>
              'isDraft' in group ? (
                <NewFolderBlock
                  key={group.id}
                  draftGroup={group}
                  onCreate={handleDraftCreate}
                  onCancel={handleDraftCancel}
                />
              ) : (
                <FolderBlock
                  key={group.id}
                  group={group}
                  tasks={tasksByGroup.get(group.id) ?? []}
                  ungroupedTasks={ungroupedTasks}
                  onDeleteClick={handleDeleteClick}
                  onOptimisticUpdate={handleOptimisticUpdate}
                  onTaskMoved={handleTaskMoved}
                />
              )
            )}
          </div>
        </SortableContext>
      </DndContext>

      <DeleteGroupDialog
        groupId={deleteGroupId}
        groupName={deleteGroupName}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={handleGroupDeleted}
      />
    </>
  )
}
