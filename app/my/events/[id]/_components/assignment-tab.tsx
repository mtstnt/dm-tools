"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, CheckCircle, Plus, X, Trash2 } from "lucide-react"
import { DataTable, type DataTableColumnDef } from "@/components/custom/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { EventArea, EventAssignedUser, EventUser } from "@/types/event"
import type { Task } from "@/actions/master/tasks"

type SubmitStatus = "idle" | "submitting" | "success" | "error"

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

const BLOCK_COLORS = [
  { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-800 dark:text-blue-200", hover: "hover:bg-blue-200 dark:hover:bg-blue-800/60" },
  { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-800 dark:text-emerald-200", hover: "hover:bg-emerald-200 dark:hover:bg-emerald-800/60" },
  { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-800 dark:text-amber-200", hover: "hover:bg-amber-200 dark:hover:bg-amber-800/60" },
  { bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-800 dark:text-purple-200", hover: "hover:bg-purple-200 dark:hover:bg-purple-800/60" },
  { bg: "bg-rose-100 dark:bg-rose-900/40", text: "text-rose-800 dark:text-rose-200", hover: "hover:bg-rose-200 dark:hover:bg-rose-800/60" },
  { bg: "bg-cyan-100 dark:bg-cyan-900/40", text: "text-cyan-800 dark:text-cyan-200", hover: "hover:bg-cyan-200 dark:hover:bg-cyan-800/60" },
  { bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-800 dark:text-orange-200", hover: "hover:bg-orange-200 dark:hover:bg-orange-800/60" },
  { bg: "bg-teal-100 dark:bg-teal-900/40", text: "text-teal-800 dark:text-teal-200", hover: "hover:bg-teal-200 dark:hover:bg-teal-800/60" },
  { bg: "bg-pink-100 dark:bg-pink-900/40", text: "text-pink-800 dark:text-pink-200", hover: "hover:bg-pink-200 dark:hover:bg-pink-800/60" },
  { bg: "bg-indigo-100 dark:bg-indigo-900/40", text: "text-indigo-800 dark:text-indigo-200", hover: "hover:bg-indigo-200 dark:hover:bg-indigo-800/60" },
]

function getBlockColor(blockName: string) {
  return BLOCK_COLORS[hashString(blockName) % BLOCK_COLORS.length]
}

function compareBlockNames(a: string, b: string) {
  return a.localeCompare(b, "id", { sensitivity: "base" })
}

function BlockPicker({
  user,
  areas,
  onAssign,
}: {
  user: EventAssignedUser
  areas: EventArea[]
  onAssign: (userIds: number[], blockIds: number[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedBlockIds, setSelectedBlockIds] = useState<number[]>([])

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)")
    const updateIsMobile = () => setIsMobile(mediaQuery.matches)
    updateIsMobile()
    mediaQuery.addEventListener("change", updateIsMobile)
    return () => mediaQuery.removeEventListener("change", updateIsMobile)
  }, [])

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) setSelectedBlockIds([])
  }

  function handleAddBlocks() {
    if (selectedBlockIds.length === 0) return
    onAssign([user.id], selectedBlockIds)
    handleOpenChange(false)
  }

  function toggleBlock(blockId: number) {
    setSelectedBlockIds((current) =>
      current.includes(blockId)
        ? current.filter((id) => id !== blockId)
        : [...current, blockId],
    )
  }

  const blockSelector = (
    <>
      <div className="space-y-2">
        {[...areas].sort((a, b) => compareBlockNames(a.name, b.name)).map((area) => (
          <div key={area.id} className="grid grid-cols-4 gap-2">
            {[...area.blocks].sort((a, b) => compareBlockNames(a.name, b.name)).map((block) => {
              const isAssigned = user.assignedBlocks.includes(block.id)
              const isSelected = selectedBlockIds.includes(block.id)
              return (
                <Button
                  key={block.id}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  disabled={isAssigned}
                  aria-pressed={isSelected}
                  onClick={() => toggleBlock(block.id)}
                  className="h-8 px-2"
                >
                  {block.name}
                </Button>
              )
            })}
          </div>
        ))}
      </div>
      <Button size="sm" onClick={handleAddBlocks} disabled={selectedBlockIds.length === 0}>
        Add blocks
      </Button>
    </>
  )

  const trigger = (
    <Button variant="outline" size="icon-sm" className="size-7 rounded-full">
      <Plus className="size-3.5" />
      <span className="sr-only">Add blocks for {user.fullName}</span>
    </Button>
  )

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger render={trigger} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Blocks</DialogTitle>
          </DialogHeader>
          {blockSelector}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="start">
        <PopoverHeader>
          <PopoverTitle>Add Blocks</PopoverTitle>
        </PopoverHeader>
        {blockSelector}
      </PopoverContent>
    </Popover>
  )
}

function PlannerPlaceholder() {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed bg-muted/30 p-6 text-center">
      <div>
        <p className="font-medium">Planner mode</p>
        <p className="mt-1 text-sm text-muted-foreground">Planner controls will appear here.</p>
      </div>
    </div>
  )
}

function TaskPicker({
  user,
  tasks,
  assignedTaskIds,
  onTasksChange,
}: {
  user: EventAssignedUser
  tasks: Task[]
  assignedTaskIds: number[]
  onTasksChange: (taskIds: number[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([])

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)")
    const updateIsMobile = () => setIsMobile(mediaQuery.matches)
    updateIsMobile()
    mediaQuery.addEventListener("change", updateIsMobile)
    return () => mediaQuery.removeEventListener("change", updateIsMobile)
  }, [])

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) setSelectedTaskIds([])
  }

  function toggleTask(taskId: number) {
    setSelectedTaskIds((current) =>
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId],
    )
  }

  function handleAddTasks() {
    if (selectedTaskIds.length === 0) return
    onTasksChange([...new Set([...assignedTaskIds, ...selectedTaskIds])])
    handleOpenChange(false)
  }

  const taskSelector = (
    <>
      <div className="grid grid-cols-4 gap-2">
        {tasks.map((task) => {
          const isAssigned = assignedTaskIds.includes(task.id)
          const isSelected = selectedTaskIds.includes(task.id)
          return (
            <Button
              key={task.id}
              type="button"
              variant={isSelected ? "default" : "outline"}
              size="sm"
              disabled={isAssigned}
              aria-pressed={isSelected}
              onClick={() => toggleTask(task.id)}
              className="h-8 px-2"
            >
              {task.name}
            </Button>
          )
        })}
      </div>
      <Button size="sm" onClick={handleAddTasks} disabled={selectedTaskIds.length === 0}>
        Add tasks
      </Button>
    </>
  )

  const trigger = (
    <Button variant="outline" size="icon-sm" className="size-7 rounded-full" disabled={tasks.length === 0}>
      <Plus className="size-3.5" />
      <span className="sr-only">Add tasks for {user.fullName}</span>
    </Button>
  )

  const picker = isMobile ? (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Tasks</DialogTitle>
        </DialogHeader>
        {taskSelector}
      </DialogContent>
    </Dialog>
  ) : (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="start">
        <PopoverHeader>
          <PopoverTitle>Add Tasks</PopoverTitle>
        </PopoverHeader>
        {taskSelector}
      </PopoverContent>
    </Popover>
  )

  return (
    <div className="flex flex-wrap gap-1.5">
      {assignedTaskIds.map((taskId) => {
        const task = tasks.find((candidate) => candidate.id === taskId)
        if (!task) return null
        const color = getBlockColor(task.name)
        return (
          <Badge
            key={task.id}
            className={cn(
              "h-7 cursor-pointer pr-1 text-sm font-medium border-transparent",
              color.bg,
              color.text,
              color.hover,
            )}
            onClick={() => onTasksChange(assignedTaskIds.filter((id) => id !== task.id))}
          >
            {task.name}
            <X className="ml-1 size-3.5" />
          </Badge>
        )
      })}
      {picker}
    </div>
  )
}

export function AssignmentTab({
  users,
  allUsers,
  areas,
  tasks,
  onAssignAction,
  onRemoveBlockAction,
  onRemoveUserAction,
}: {
  users: EventAssignedUser[]
  allUsers: EventUser[]
  areas: EventArea[]
  tasks: Task[]
  onAssignAction: (userIds: number[], blockIds: number[]) => void
  onRemoveBlockAction: (userId: number, blockId: number) => void
  onRemoveUserAction: (userId: number) => void
}) {
  const [selectedUsers, setSelectedUsers] = useState<MultiSelectOption[]>([])
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle")
  const [deletingUser, setDeletingUser] = useState<EventAssignedUser | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const [plannerMode, setPlannerMode] = useState(false)
  const [taskIdsByUser, setTaskIdsByUser] = useState<Record<number, number[]>>({})

  const blocks = useMemo(() => areas.flatMap((area) => area.blocks), [areas])
  const blockMap = useMemo(() => new Map(blocks.map((b) => [b.id, b])), [blocks])
  const seatCounterTaskId = useMemo(
    () => tasks.find((task) => task.name.trim().toLowerCase() === "sc")?.id,
    [tasks],
  )

  const userOptions = useMemo<MultiSelectOption[]>(
    () =>
      allUsers
        .filter((user) => !users.some((assignedUser) => assignedUser.id === user.id))
        .map((u) => ({
          label: u.fullName,
          value: String(u.id),
        })),
    [allUsers, users],
  )

  function handleSubmit() {
    if (selectedUsers.length === 0) return

    setSubmitStatus("submitting")

    setTimeout(() => {
      const userIds = selectedUsers.map((u) => Number(u.value))
      onAssignAction(userIds, [])
      setSubmitStatus("success")
      setSelectedUsers([])
      setTimeout(() => setSubmitStatus("idle"), 2000)
    }, 400)
  }

  function handleDeleteConfirm() {
    if (!deletingUser) return
    setDeletePending(true)
    setTimeout(() => {
      onRemoveUserAction(deletingUser.id)
      setTaskIdsByUser((current) => {
        const remaining = { ...current }
        delete remaining[deletingUser.id]
        return remaining
      })
      setDeletePending(false)
      setDeletingUser(null)
    }, 300)
  }

  const columns: DataTableColumnDef<EventAssignedUser, unknown>[] = [
      {
        accessorKey: "fullName",
        header: "User",
        meta: { sortMethod: "string" },
        cell: ({ row }) => {
          const user = row.original
          return (
            <div>
              <p className="font-medium">{user.fullName}</p>
              {user.email && (
                <p className="text-xs text-muted-foreground">{user.email}</p>
              )}
            </div>
          )
        },
      },
      {
        id: "task",
        header: "Task",
        enableSorting: false,
        cell: ({ row }) => {
          const user = row.original
          return (
            <TaskPicker
              user={user}
              tasks={tasks}
              assignedTaskIds={taskIdsByUser[user.id] ?? []}
              onTasksChange={(taskIds) => {
                setTaskIdsByUser((current) => ({ ...current, [user.id]: taskIds }))
              }}
            />
          )
        },
      },
      {
        id: "blocks",
        header: "Blocks",
        enableSorting: false,
        cell: ({ row }) => {
          const user = row.original
          const isSeatCounter = seatCounterTaskId !== undefined &&
            (taskIdsByUser[user.id] ?? []).includes(seatCounterTaskId)
          if (!isSeatCounter) {
            return <span className="text-sm text-muted-foreground">Only for Seat Counters</span>
          }
          return (
            <div className="flex flex-wrap gap-1.5">
              {[...user.assignedBlocks]
                .sort((a, b) =>
                  compareBlockNames(blockMap.get(a)?.name ?? "", blockMap.get(b)?.name ?? ""),
                )
                .map((blockId) => {
                const block = blockMap.get(blockId)
                if (!block) return null
                const color = getBlockColor(block.name)
                return (
                  <Badge
                    key={block.id}
                    className={cn(
                      "h-7 pr-1 text-sm font-medium border-transparent cursor-pointer",
                      color.bg,
                      color.text,
                      color.hover,
                    )}
                    onClick={() => onRemoveBlockAction(user.id, block.id)}
                  >
                    {block.name}
                    <X className="ml-1 size-3.5" />
                  </Badge>
                )
              })}
              <BlockPicker user={user} areas={areas} onAssign={onAssignAction} />
            </div>
          )
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const user = row.original
          return (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setDeletingUser(user)}
            >
              <Trash2 className="size-4" />
            </Button>
          )
        },
      },
  ]

  return (
    <div className="space-y-4 py-2 min-h-screen">
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
        <div>
          <p className="text-sm font-medium">Planner mode</p>
          <p className="text-xs text-muted-foreground">Plan assignments with the upcoming planner.</p>
        </div>
        <Switch checked={plannerMode} onCheckedChange={setPlannerMode} aria-label="Enable planner mode" />
      </div>

      {plannerMode ? (
        <PlannerPlaceholder />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1">
              <MultiSelect
                options={userOptions}
                value={selectedUsers}
                onChange={setSelectedUsers}
                placeholder="Select users..."
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={selectedUsers.length === 0 || submitStatus === "submitting"}
              className="shrink-0"
            >
              {submitStatus === "submitting" && <Loader2 className="mr-2 size-4 animate-spin" />}
              {submitStatus === "success" && <CheckCircle className="mr-2 size-4" />}
              {submitStatus === "submitting"
                ? "Assigning..."
                : submitStatus === "success"
                  ? "Assigned!"
                  : "Add users"}
            </Button>
          </div>

          <DataTable
            columns={columns}
            data={users}
            defaultSortColumn="fullName"
            pageSize={10}
          />
        </>
      )}

      <Dialog
        open={deletingUser !== null}
        onOpenChange={(open) => !open && setDeletingUser(null)}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Remove User</DialogTitle>
            <DialogDescription>
              Remove <strong>{deletingUser?.fullName}</strong> from this event?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingUser(null)}
              disabled={deletePending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deletePending}
            >
              {deletePending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
