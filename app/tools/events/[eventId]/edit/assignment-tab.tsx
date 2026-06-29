"use client"

import { useMemo, useState } from "react"
import { Loader2, CheckCircle, X } from "lucide-react"
import { getWebAuthCookie } from "@/components/web-auth-guard"
import { updateUserBlocks, removeUserBlock, updateEventUsers } from "@/lib/queries/events"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  DialogClose,
} from "@/components/ui/dialog"
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select"
import { cn } from "@/lib/utils"
import type { EventDetailsData } from "@/types/event"

type SubmitStatus = "idle" | "submitting" | "success" | "error"

const ALLOWED_USER_IDS = new Set([
  3086, 4554, 5457, 5456, 5918, 1644, 6456, 4553, 6203, 5907,
  1399, 6844, 5444, 4636, 5882, 5443, 6870, 6860, 5464, 5458,
  3735, 6874, 5436, 5912, 6199, 5439, 5875, 1631, 5437, 1682,
  4709, 6871, 6445, 4678, 1685, 6846,
])

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
  { bg: "bg-sky-100 dark:bg-sky-900/40", text: "text-sky-800 dark:text-sky-200", hover: "hover:bg-sky-200 dark:hover:bg-sky-800/60" },
  { bg: "bg-lime-100 dark:bg-lime-900/40", text: "text-lime-800 dark:text-lime-200", hover: "hover:bg-lime-200 dark:hover:bg-lime-800/60" },
  { bg: "bg-fuchsia-100 dark:bg-fuchsia-900/40", text: "text-fuchsia-800 dark:text-fuchsia-200", hover: "hover:bg-fuchsia-200 dark:hover:bg-fuchsia-800/60" },
  { bg: "bg-violet-100 dark:bg-violet-900/40", text: "text-violet-800 dark:text-violet-200", hover: "hover:bg-violet-200 dark:hover:bg-violet-800/60" },
  { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-800 dark:text-red-200", hover: "hover:bg-red-200 dark:hover:bg-red-800/60" },
  { bg: "bg-green-100 dark:bg-green-900/40", text: "text-green-800 dark:text-green-200", hover: "hover:bg-green-200 dark:hover:bg-green-800/60" },
  { bg: "bg-yellow-100 dark:bg-yellow-900/40", text: "text-yellow-800 dark:text-yellow-200", hover: "hover:bg-yellow-200 dark:hover:bg-yellow-800/60" },
  { bg: "bg-stone-100 dark:bg-stone-900/40", text: "text-stone-800 dark:text-stone-200", hover: "hover:bg-stone-200 dark:hover:bg-stone-800/60" },
  { bg: "bg-slate-100 dark:bg-slate-900/40", text: "text-slate-800 dark:text-slate-200", hover: "hover:bg-slate-200 dark:hover:bg-slate-800/60" },
  { bg: "bg-zinc-100 dark:bg-zinc-900/40", text: "text-zinc-800 dark:text-zinc-200", hover: "hover:bg-zinc-200 dark:hover:bg-zinc-800/60" },
]

function getBlockColor(blockName: string) {
  return BLOCK_COLORS[hashString(blockName) % BLOCK_COLORS.length]
}

export function AssignmentTab({
  rows,
  users,
  assignedUserIds,
  allUsers,
  blocks,
  csrf,
  eventId,
}: {
  rows: { id: number; name: string; email: string | null; blocks: { id: number; name: string }[] }[]
  users: EventDetailsData["users"]
  allUsers: EventDetailsData["allUsers"]
  blocks: EventDetailsData["blocks"]
  csrf: string | null
  eventId: string
  assignedUserIds: number[]
}) {
  const [selectedUsers, setSelectedUsers] = useState<MultiSelectOption[]>([])
  const [selectedBlocks, setSelectedBlocks] = useState<MultiSelectOption[]>([])
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle")
  const [submitError, setSubmitError] = useState("")
  const [deletingBlockId, setDeletingBlockId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState("")

  const assignedUserIdsSet = useMemo(() => new Set(assignedUserIds), [assignedUserIds])

  const blockOptions = useMemo<MultiSelectOption[]>(
    () =>
      blocks.map((block) => ({
        label: block.name,
        value: String(block.id),
      })),
    [blocks],
  )

  const handleSubmit = async () => {
    if (selectedUsers.length === 0 || selectedBlocks.length === 0) return

    const cookie = getWebAuthCookie()
    if (!cookie) {
      setSubmitStatus("error")
      setSubmitError("Not authenticated")
      return
    }

    setSubmitStatus("submitting")
    setSubmitError("")

    try {
      const userIds = selectedUsers.map((u) => Number(u.value))
      const blockIds = selectedBlocks.map((b) => Number(b.value))
      const csrfToken = csrf ?? ""

      const allUserIds = [...new Set([...assignedUserIds.map(String), ...userIds.map(String)])]
      const updateResult = await updateEventUsers({ cookie, csrf: csrfToken }, eventId, allUserIds)
      if (!updateResult.success) {
        setSubmitStatus("error")
        setSubmitError(updateResult.error ?? "Failed to update event users")
        return
      }

      const result = await updateUserBlocks({ cookie, csrf: csrfToken }, eventId, userIds, blockIds)

      if (result.success) {
        setSubmitStatus("success")
        setTimeout(() => {
          setSubmitStatus("idle")
          setSelectedUsers([])
          setSelectedBlocks([])
          window.location.reload()
        }, 2000)
      } else {
        setSubmitStatus("error")
        setSubmitError(result.error ?? "Failed to update")
      }
    } catch (err) {
      setSubmitStatus("error")
      setSubmitError(err instanceof Error ? err.message : "Unknown error")
    }
  }

  const handleRemoveBlock = async (userId: number, blockId: number) => {
    const cookie = getWebAuthCookie()
    if (!cookie) {
      setDeleteError("Not authenticated")
      return
    }

    setDeletingBlockId(blockId)
    setDeleteError("")

    try {
      const result = await removeUserBlock({ cookie, csrf: csrf ?? "" }, eventId, userId, blockId)
      if (result.success) {
        window.location.reload()
      } else {
        setDeleteError(result.error ?? "Failed to remove block")
        setDeletingBlockId(null)
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Unknown error")
      setDeletingBlockId(null)
    }
  }

  const filteredUsers = useMemo(
    () =>
      allUsers
        .filter((user) => ALLOWED_USER_IDS.has(Number(user.id)))
        .map((user) => ({
          label: user.fullName,
          value: String(user.id),
          isAssigned: assignedUserIdsSet.has(user.id),
        })),
    [allUsers, assignedUserIdsSet],
  )

  const visibleRows = useMemo(
    () => rows.filter((row) => assignedUserIdsSet.has(row.id)),
    [rows, assignedUserIdsSet],
  )

  return (
    <div className="space-y-4 py-2">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 min-w-0">
          <MultiSelect
            options={filteredUsers}
            value={selectedUsers}
            onChange={setSelectedUsers}
            placeholder="Select users..."
          />
        </div>
        <div className="flex-1 min-w-0">
          <MultiSelect
            options={blockOptions}
            value={selectedBlocks}
            onChange={setSelectedBlocks}
            placeholder="Select blocks..."
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={
            selectedUsers.length === 0 ||
            selectedBlocks.length === 0 ||
            submitStatus === "submitting"
          }
          className="shrink-0"
        >
          {submitStatus === "submitting" && <Loader2 className="mr-2 size-4 animate-spin" />}
          {submitStatus === "success" && <CheckCircle className="mr-2 size-4" />}
          {submitStatus === "submitting"
            ? "Assigning..."
            : submitStatus === "success"
              ? "Assigned!"
              : "Assign"}
        </Button>
      </div>

      {submitStatus === "error" && (
        <p className="text-sm text-destructive">{submitError}</p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Blocks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                No users assigned yet.
              </TableCell>
            </TableRow>
          ) : (
            visibleRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-medium">{row.name}</p>
                  {row.email && (
                    <p className="text-xs text-muted-foreground">{row.email}</p>
                  )}
                </TableCell>
                <TableCell>
                  {row.blocks.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {row.blocks.map((block) => {
                        const color = getBlockColor(block.name)
                        return (
                          <Dialog key={block.id} onOpenChange={(open) => { if (!open) setDeleteError("") }}>
                            <Badge
                              className={cn(
                                "h-7 pr-1 text-sm font-medium border-transparent",
                                color.bg,
                                color.text,
                              )}
                            >
                              {block.name}
                              <DialogTrigger
                                render={
                                  <button
                                    className={cn(
                                      "ml-1 cursor-pointer rounded-full p-0.5 transition-colors",
                                      color.hover,
                                    )}
                                  />
                                }
                              >
                                <X className="size-3.5" />
                              </DialogTrigger>
                            </Badge>
                            <DialogContent showCloseButton={false}>
                              <DialogHeader>
                                <DialogTitle>Remove Block</DialogTitle>
                                <DialogDescription>
                                  Remove <strong>{block.name}</strong> from <strong>{row.name}</strong>?
                                </DialogDescription>
                              </DialogHeader>
                              {deleteError && (
                                <p className="text-sm text-destructive">{deleteError}</p>
                              )}
                              <DialogFooter>
                                <DialogClose render={<Button variant="outline" />}>
                                  Cancel
                                </DialogClose>
                                <Button
                                  variant="destructive"
                                  disabled={deletingBlockId === block.id}
                                  onClick={() => handleRemoveBlock(row.id, block.id)}
                                >
                                  {deletingBlockId === block.id && (
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                  )}
                                  Remove
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )
                      })}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
