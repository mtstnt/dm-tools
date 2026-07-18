"use client"

import * as React from "react"
import { PlusIcon, TrashIcon } from "lucide-react"

import {
  getPermissions,
  createPermission,
  updatePermission,
  deletePermission,
  type Permission,
} from "@/actions/users/permissions"
import { DataTable, type DataTableColumnDef } from "@/components/custom/data-table"
import { actionsEnum, type Action } from "@/db/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type PermissionCell = {
  id: number | null
  exists: boolean
}

type PermissionRow = {
  resource: string
  displayResource: string
  create: PermissionCell
  read: PermissionCell
  update: PermissionCell
  delete: PermissionCell
  execute: PermissionCell
}

function formatResourceName(resource: string): string {
  return resource
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const actionsList = [...actionsEnum]

function buildPermissionRows(
  permissions: Permission[],
): PermissionRow[] {
  const grouped = new Map<string, Map<Action, number>>()

  for (const permission of permissions) {
    const actions = grouped.get(permission.resource) ?? new Map<Action, number>()
    actions.set(permission.action, permission.id)
    grouped.set(permission.resource, actions)
  }

  const rows: PermissionRow[] = []
  for (const [resource, actions] of grouped) {
    rows.push({
      resource,
      displayResource: formatResourceName(resource),
      create: { id: actions.get("create") ?? null, exists: actions.has("create") },
      read: { id: actions.get("read") ?? null, exists: actions.has("read") },
      update: { id: actions.get("update") ?? null, exists: actions.has("update") },
      delete: { id: actions.get("delete") ?? null, exists: actions.has("delete") },
      execute: { id: actions.get("execute") ?? null, exists: actions.has("execute") },
    })
  }

  return rows.sort((a, b) => a.resource.localeCompare(b.resource))
}

export default function PermissionsPage() {
  const [rows, setRows] = React.useState<PermissionRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [createResource, setCreateResource] = React.useState("")
  const [createAction, setCreateAction] = React.useState<Action | "">("")
  const [createPending, setCreatePending] = React.useState(false)

  const [editingCell, setEditingCell] = React.useState<{
    row: PermissionRow
    action: Action
  } | null>(null)
  const [editResource, setEditResource] = React.useState("")
  const [editAction, setEditAction] = React.useState<Action | "">("")
  const [editPending, setEditPending] = React.useState(false)

  const [deletingRow, setDeletingRow] = React.useState<PermissionRow | null>(null)
  const [deletePending, setDeletePending] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const result = await getPermissions()

      if (cancelled) return

      if (!result.success || !result.data) {
        setError(result.error ?? "Failed to load permissions")
        setRows([])
      } else {
        setRows(buildPermissionRows(result.data))
      }

      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  function getCell(
    row: PermissionRow,
    action: Action,
  ): PermissionCell {
    return row[action]
  }

  async function handleToggle(row: PermissionRow, action: Action) {
    const cell = getCell(row, action)

    if (cell.exists && cell.id !== null) {
      const result = await deletePermission(cell.id)
      if (!result.success) {
        setError(result.error ?? "Failed to delete permission")
        return
      }
      setRows((prev) =>
        prev.map((r) =>
          r.resource === row.resource
            ? { ...r, [action]: { id: null, exists: false } }
            : r,
        ),
      )
    } else if (!cell.exists) {
      const result = await createPermission(row.resource, action)
      if (!result.success || !result.data) {
        setError(result.error ?? "Failed to create permission")
        return
      }
      setRows((prev) =>
        prev.map((r) =>
          r.resource === row.resource
            ? { ...r, [action]: { id: result.data!.id, exists: true } }
            : r,
        ),
      )
    }
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!createResource.trim() || !createAction) return

    setCreatePending(true)
    setError(null)

    const result = await createPermission(createResource, createAction as Action)
    setCreatePending(false)

    if (!result.success || !result.data) {
      setError(result.error ?? "Failed to create permission")
      return
    }

    const newPerm = result.data
    setRows((prev) => {
      const existing = prev.find((r) => r.resource === newPerm.resource)
      if (existing) {
        return prev.map((r) =>
          r.resource === newPerm.resource
            ? { ...r, [newPerm.action]: { id: newPerm.id, exists: true } }
            : r,
        )
      }
      const newRow: PermissionRow = {
        resource: newPerm.resource,
        displayResource: formatResourceName(newPerm.resource),
        create: { id: null, exists: false },
        read: { id: null, exists: false },
        update: { id: null, exists: false },
        delete: { id: null, exists: false },
        execute: { id: null, exists: false },
      }
      newRow[newPerm.action] = { id: newPerm.id, exists: true }
      return [...prev, newRow].sort((a, b) =>
        a.resource.localeCompare(b.resource),
      )
    })

    setIsCreateOpen(false)
    setCreateResource("")
    setCreateAction("")
  }

  function openEdit(row: PermissionRow, action: Action) {
    const cell = getCell(row, action)
    if (!cell.exists || cell.id === null) return
    setEditingCell({ row, action })
    setEditResource(row.resource)
    setEditAction(action)
  }

  async function handleDeleteConfirm() {
    if (!deletingRow) return

    setDeletePending(true)
    setError(null)

    for (const a of actionsEnum) {
      const c = getCell(deletingRow, a)
      if (c.exists && c.id !== null) {
        await deletePermission(c.id)
      }
    }
    setRows((prev) => prev.filter((row) => row.resource !== deletingRow.resource))
    setDeletePending(false)
    setDeletingRow(null)
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingCell || !editResource.trim() || !editAction) return
    const cell = getCell(editingCell.row, editingCell.action)
    if (cell.id === null) return

    setEditPending(true)
    setError(null)

    const result = await updatePermission(
      cell.id,
      editResource,
      editAction as Action,
    )
    setEditPending(false)

    if (!result.success || !result.data) {
      setError(result.error ?? "Failed to update permission")
      return
    }

    const updated = result.data
    setRows((prev) => {
      const filtered = prev.filter((r) => r.resource !== editingCell.row.resource)
      const target = prev.find((r) => r.resource === editingCell.row.resource)
      if (!target) return prev

      const newCells = { ...target }
      newCells[editingCell.action] = { id: null, exists: false }

      const existing = filtered.find((r) => r.resource === updated.resource)
      if (existing) {
        return filtered.map((r) =>
          r.resource === updated.resource
            ? { ...r, [updated.action]: { id: updated.id, exists: true } }
            : r,
        )
      }

      const newRow: PermissionRow = {
        resource: updated.resource,
        displayResource: formatResourceName(updated.resource),
        create: { id: null, exists: false },
        read: { id: null, exists: false },
        update: { id: null, exists: false },
        delete: { id: null, exists: false },
        execute: { id: null, exists: false },
      }
      newRow[updated.action] = { id: updated.id, exists: true }
      return [...filtered, newRow].sort((a, b) =>
        a.resource.localeCompare(b.resource),
      )
    })

    setEditingCell(null)
  }

  const columns: DataTableColumnDef<PermissionRow, unknown>[] = [
    {
      accessorKey: "displayResource",
      header: "Resource Name",
      meta: { sortMethod: "string" },
    },
    ...actionsEnum.map((action) => ({
      accessorKey: action,
      header: action.charAt(0).toUpperCase() + action.slice(1),
      cell: ({ row }: { row: { original: PermissionRow } }) => {
        const cell = getCell(row.original, action)
        return (
          <input
            type="checkbox"
            className="size-4 rounded border-input"
            checked={cell.exists}
            onChange={() => handleToggle(row.original, action)}
            aria-label={`${action} permission for ${row.original.resource}`}
          />
        )
      },
      enableSorting: false,
    })),
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original
        const hasAny = actionsEnum.some(
          (a) => getCell(r, a).exists && getCell(r, a).id !== null,
        )
        if (!hasAny) return null
        return (
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeletingRow(r)}
          >
            <TrashIcon className="size-3" />
            <span className="sr-only">Delete</span>
          </Button>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Permissions</h1>
          <p className="text-muted-foreground mt-2">Manage permissions.</p>
        </div>
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            if (!open) {
              setCreateResource("")
              setCreateAction("")
            }
            setIsCreateOpen(open)
          }}
        >
          <DialogContent>
            <form onSubmit={handleCreateSubmit}>
              <DialogHeader>
                <DialogTitle>Add Permission</DialogTitle>
                <DialogDescription>
                  Create a new permission.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="create-resource" className="text-sm font-medium">
                    Resource
                  </label>
                  <Input
                    id="create-resource"
                    value={createResource}
                    onChange={(e) => setCreateResource(e.target.value)}
                    placeholder="e.g. regions"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="create-action" className="text-sm font-medium">
                    Action
                  </label>
                  <Select
                    value={createAction}
                    onValueChange={(v) => v && setCreateAction(v as Action)}
                  >
                    <SelectTrigger id="create-action" className="w-full">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      {actionsList.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={createPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createPending || !createResource.trim() || !createAction}>
                  {createPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Button onClick={() => setIsCreateOpen(true)}>
          <PlusIcon className="size-4" />
          Add Permission
        </Button>
      </div>

      {error && !isCreateOpen && !editingCell && (
        <p className="text-destructive">{error}</p>
      )}

      {loading ? (
        <div className="text-muted-foreground">Loading permissions...</div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          searchColumn="displayResource"
          searchPlaceholder="Search resource..."
          defaultSortColumn="displayResource"
        />
      )}

      <Dialog
        open={editingCell !== null}
        onOpenChange={(open) => {
          if (!open) setEditingCell(null)
        }}
      >
        <DialogContent>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Permission</DialogTitle>
              <DialogDescription>
                Update the permission details.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="edit-resource" className="text-sm font-medium">
                  Resource
                </label>
                <Input
                  id="edit-resource"
                  value={editResource}
                  onChange={(e) => setEditResource(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="edit-action" className="text-sm font-medium">
                  Action
                </label>
                <Select
                  value={editAction}
                  onValueChange={(v) => v && setEditAction(v as Action)}
                >
                  <SelectTrigger id="edit-action" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {actionsList.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingCell(null)}
                disabled={editPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editPending || !editResource.trim() || !editAction}>
                {editPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deletingRow !== null}
        onOpenChange={(open) => !open && setDeletingRow(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Permission</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the permission resource &quot;{deletingRow?.displayResource}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingRow(null)}
              disabled={deletePending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deletePending}
            >
              {deletePending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
