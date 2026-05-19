'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon, Delete02Icon, Folder01Icon } from '@hugeicons/core-free-icons'
import { FolderBlock } from './FolderBlock'
import { NewFolderBlock } from './NewFolderBlock'
import { DeleteGroupDialog } from '@/components/groups/DeleteGroupDialog'
import {
  reorderGroups,
  createGroup,
  deleteGroupAndUngroup,
  bulkDeleteGroupsAndUngroup,
} from '@/actions/groups'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { useTaskSheetStore } from '@/stores/useTaskSheetStore'
import { useGroupsStore } from '@/stores/useGroupsStore'
import { useI18n } from '@/lib/messages'
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
  const { t } = useI18n()
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
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set())
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [bulkDeletePending, setBulkDeletePending] = useState(false)

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
  const selectedCount = selectedGroupIds.size

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

  const exitSelectMode = useCallback(() => {
    setIsSelectMode(false)
    setSelectedGroupIds(new Set())
  }, [])

  const toggleSelectMode = useCallback(() => {
    setIsSelectMode((current) => {
      if (current) {
        setSelectedGroupIds(new Set())
      }
      return !current
    })
  }, [])

  const toggleFolderSelection = useCallback((groupId: string) => {
    setSelectedGroupIds((current) => {
      const next = new Set(current)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }, [])

  useEffect(() => {
    const validIds = new Set(
      groups.filter((group): group is TaskGroup => !('isDraft' in group)).map((group) => group.id)
    )
    setSelectedGroupIds((current) => {
      const next = new Set<string>()
      current.forEach((id) => {
        if (validIds.has(id)) {
          next.add(id)
        }
      })
      return next.size === current.size ? current : next
    })
  }, [groups])

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

      toast.success(t.dashboard.folders.createdSuccess)
    } catch (error) {
      const message = error instanceof Error ? error.message : t.dashboard.folders.createError
      toast.error(message)
    }
  }, [groups])

  const handleBulkDelete = useCallback(async () => {
    if (selectedGroupIds.size === 0 || bulkDeletePending) {
      return
    }

    const selectedIds = Array.from(selectedGroupIds)
    const selectedSet = new Set(selectedIds)
    const snapshotGroups = groups
    const snapshotTasks = tasks
    const snapshotTaskAssignments = new Map<string, string>()

    snapshotTasks.forEach((task) => {
      if (task.groupId && selectedSet.has(task.groupId)) {
        snapshotTaskAssignments.set(task.id, task.groupId)
      }
    })

    const optimisticGroups = snapshotGroups.filter((group) => !selectedSet.has(group.id))
    setGroups(optimisticGroups)
    setTasks((current) =>
      current.map((task) =>
        task.groupId && selectedSet.has(task.groupId) ? { ...task, groupId: null } : task
      )
    )
    storeSetGroups(
      optimisticGroups.filter((group): group is TaskGroup => !('isDraft' in group))
    )

    setBulkDeletePending(true)
    try {
      const result = await bulkDeleteGroupsAndUngroup(selectedIds)

      if (result.failed.length === 0) {
        setBulkDeleteDialogOpen(false)
        exitSelectMode()
        toast.success(
          t.dashboard.folders.bulkDeleteSuccess
            .replace('{count}', String(result.deletedIds.length))
            .replace('{plural}', result.deletedIds.length === 1 ? '' : 's')
        )
        return
      }

      const deletedSet = new Set(result.deletedIds)
      const failedSet = new Set(result.failed.map((entry) => entry.groupId))
      const restoredGroups = snapshotGroups.filter(
        (group) => !deletedSet.has(group.id) || 'isDraft' in group
      )

      setGroups(restoredGroups)
      setTasks((current) =>
        current.map((task) => {
          const originalGroupId = snapshotTaskAssignments.get(task.id)
          if (!originalGroupId) return task
          if (failedSet.has(originalGroupId)) {
            return { ...task, groupId: originalGroupId }
          }
          return task
        })
      )
      storeSetGroups(restoredGroups.filter((group): group is TaskGroup => !('isDraft' in group)))
      setSelectedGroupIds(failedSet)
      setBulkDeleteDialogOpen(false)

      const failedNames = snapshotGroups
        .filter((group): group is TaskGroup => !('isDraft' in group) && failedSet.has(group.id))
        .map((group) => group.name)
        .join(', ')

      toast.error(
        t.dashboard.folders.bulkDeletePartialError
          .replace('{failed}', String(result.failed.length))
          .replace('{total}', String(selectedIds.length))
          .replace('{names}', failedNames || t.dashboard.folders.bulkDeleteUnknownFolder)
      )
    } catch (error) {
      setGroups(snapshotGroups)
      setTasks(snapshotTasks)
      storeSetGroups(snapshotGroups.filter((group): group is TaskGroup => !('isDraft' in group)))
      const message = error instanceof Error ? error.message : t.dashboard.folders.bulkDeleteError
      toast.error(message)
    } finally {
      setBulkDeletePending(false)
    }
  }, [bulkDeletePending, exitSelectMode, groups, selectedGroupIds, storeSetGroups, t, tasks])

  async function handleDeleteClick(group: TaskGroup) {
    const groupTasks = tasksByGroup.get(group.id) ?? []

    // If group has no tasks, delete immediately without showing dialog
    if (groupTasks.length === 0) {
      try {
        await deleteGroupAndUngroup(group.id)
        setGroups((current) => current.filter((g) => g.id !== group.id))
        setTasks((current) =>
          current.map((task) =>
            task.groupId === group.id ? { ...task, groupId: null } : task
          )
        )
        storeRemoveGroup(group.id)
        setSelectedGroupIds((current) => {
          if (!current.has(group.id)) return current
          const next = new Set(current)
          next.delete(group.id)
          return next
        })
        toast.success(t.dashboard.folders.deletedWithUngroupSuccess)
      } catch (error) {
        const message = error instanceof Error ? error.message : t.dashboard.folders.deleteError
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
    if (deleteGroupId) {
      storeRemoveGroup(deleteGroupId)
      setTasks((current) =>
        current.map((task) =>
          task.groupId === deleteGroupId ? { ...task, groupId: null } : task
        )
      )
      setSelectedGroupIds((current) => {
        if (!current.has(deleteGroupId)) return current
        const next = new Set(current)
        next.delete(deleteGroupId)
        return next
      })
    }
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
    if (isSelectMode) {
      return
    }

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
        <div className="mb-4 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant={isSelectMode ? 'secondary' : 'outline'}
            onClick={toggleSelectMode}
            className="min-h-11"
            disabled={groups.length === 0}
          >
            {isSelectMode ? t.dashboard.folders.doneSelecting : t.dashboard.folders.selectMode}
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <HugeiconsIcon icon={Folder01Icon} size={40} className="text-muted-foreground/50" />
          <h3 className="text-base font-medium text-foreground">{t.folders.noFoldersYet}</h3>
          <button
            type="button"
            onClick={handleCreateClick}
            className="text-sm text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-2 py-1"
          >
            {t.folders.createFirstFolder}
          </button>
        </div>
        <DeleteGroupDialog
          groupId={deleteGroupId}
          groupName={deleteGroupName}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onDeleted={handleGroupDeleted}
        />
        <ConfirmDialog
          open={bulkDeleteDialogOpen}
          onOpenChange={setBulkDeleteDialogOpen}
          title={t.dashboard.folders.bulkDeleteTitle}
          description={t.dashboard.folders.bulkDeleteDescription
            .replace('{count}', String(selectedCount))
            .replace('{plural}', selectedCount === 1 ? '' : 's')}
          confirmLabel={t.dashboard.folders.bulkDeleteConfirm}
          onConfirm={handleBulkDelete}
          isPending={bulkDeletePending}
        />
      </>
    )
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        {isSelectMode ? (
          <span className="mr-1 text-sm text-muted-foreground">
            {t.dashboard.folders.selectedFoldersCount
              .replace('{count}', String(selectedCount))
              .replace('{plural}', selectedCount === 1 ? '' : 's')}
          </span>
        ) : null}
        {isSelectMode ? (
          <Button
            type="button"
            variant="destructive"
            className="min-h-11 gap-2"
            disabled={selectedCount === 0 || bulkDeletePending}
            onClick={() => setBulkDeleteDialogOpen(true)}
          >
            <HugeiconsIcon icon={Delete02Icon} size={16} />
            {t.dashboard.folders.deleteSelected}
          </Button>
        ) : null}
        <Button
          type="button"
          variant={isSelectMode ? 'secondary' : 'outline'}
          onClick={toggleSelectMode}
          className="min-h-11"
          disabled={groups.length === 0}
        >
          {isSelectMode ? t.dashboard.folders.doneSelecting : t.dashboard.folders.selectMode}
        </Button>
      </div>
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
                  isSelectMode={isSelectMode}
                  isSelected={selectedGroupIds.has(group.id)}
                  onToggleSelect={toggleFolderSelection}
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
      <ConfirmDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title={t.dashboard.folders.bulkDeleteTitle}
        description={t.dashboard.folders.bulkDeleteDescription
          .replace('{count}', String(selectedCount))
          .replace('{plural}', selectedCount === 1 ? '' : 's')}
        confirmLabel={t.dashboard.folders.bulkDeleteConfirm}
        onConfirm={handleBulkDelete}
        isPending={bulkDeletePending}
      />
    </>
  )
}
