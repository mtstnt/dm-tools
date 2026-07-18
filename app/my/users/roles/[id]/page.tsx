"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { PencilIcon, PlusIcon } from "lucide-react"

import {
  getRolePermissions,
  assignRolePermission,
  unassignRolePermission,
  updateRolePermissionScope,
  type Role,
  type RolePermissionMatrixRow,
  type ActionStatus,
} from "@/actions/users/roles"
import { Button, buttonVariants } from "@/components/ui/button"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { actionsEnum, roleScopes, type Action, type RoleScope } from "@/db/schema"

export default function RoleDetailPage() {
  const params = useParams()
  const roleId = Number(params.id)

  const [role, setRole] = React.useState<Role | null>(null)
  const [matrix, setMatrix] = React.useState<RolePermissionMatrixRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [isAssignOpen, setIsAssignOpen] = React.useState(false)
  const [assignPermissionId, setAssignPermissionId] = React.useState<string>("")
  const [assignScope, setAssignScope] = React.useState<RoleScope | "">("")
  const [assignPending, setAssignPending] = React.useState(false)

  const [editingCell, setEditingCell] = React.useState<{
    resource: string
    action: Action
    status: ActionStatus
  } | null>(null)
  const [editScope, setEditScope] = React.useState<RoleScope | "">("")
  const [editPending, setEditPending] = React.useState(false)

  React.useEffect(() => {
    if (!Number.isFinite(roleId)) {
      setError("Invalid role ID")
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const result = await getRolePermissions(roleId)

      if (cancelled) return

      if (!result.success || !result.data) {
        setError(result.error ?? "Failed to load role")
        setLoading(false)
        return
      }

      setRole(result.data.role)
      setMatrix(result.data.matrix)
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [roleId])

  const unassignedPermissions = React.useMemo(() => {
    const assignedIds = new Set<number>()
    for (const row of matrix) {
      for (const action of actionsEnum) {
        const status = row.actions[action]
        if (status?.assigned) {
          assignedIds.add(status.permissionId)
        }
      }
    }
    const result: { permissionId: number; label: string }[] = []
    for (const row of matrix) {
      for (const action of actionsEnum) {
        const status = row.actions[action]
        if (status && !assignedIds.has(status.permissionId)) {
          result.push({
            permissionId: status.permissionId,
            label: `${row.displayResource} → ${action}`,
          })
        }
      }
    }
    return result
  }, [matrix])

  async function handleToggle(status: ActionStatus) {
    if (status.assigned) {
      const result = await unassignRolePermission(roleId, status.permissionId)
      if (!result.success) {
        setError(result.error ?? "Failed to unassign permission")
        return
      }
      setMatrix((prev) =>
        prev.map((row) => {
          const newActions = { ...row.actions }
          for (const action of actionsEnum) {
            const s = newActions[action]
            if (s && s.permissionId === status.permissionId) {
              newActions[action] = { ...s, assigned: false, scope: null }
            }
          }
          return { ...row, actions: newActions }
        }),
      )
    } else {
      const result = await assignRolePermission(
        roleId,
        status.permissionId,
        "all",
      )
      if (!result.success) {
        setError(result.error ?? "Failed to assign permission")
        return
      }
      setMatrix((prev) =>
        prev.map((row) => {
          const newActions = { ...row.actions }
          for (const action of actionsEnum) {
            const s = newActions[action]
            if (s && s.permissionId === status.permissionId) {
              newActions[action] = { ...s, assigned: true, scope: "all" }
            }
          }
          return { ...row, actions: newActions }
        }),
      )
    }
  }

  async function handleAssignSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!assignPermissionId || !assignScope) return

    const permId = Number(assignPermissionId)
    setAssignPending(true)
    setError(null)

    const result = await assignRolePermission(
      roleId,
      permId,
      assignScope as RoleScope,
    )
    setAssignPending(false)

    if (!result.success) {
      setError(result.error ?? "Failed to assign permission")
      return
    }

    setMatrix((prev) =>
      prev.map((row) => {
        const newActions = { ...row.actions }
        for (const action of actionsEnum) {
          const s = newActions[action]
          if (s && s.permissionId === permId) {
            newActions[action] = {
              ...s,
              assigned: true,
              scope: assignScope as RoleScope,
            }
          }
        }
        return { ...row, actions: newActions }
      }),
    )

    setIsAssignOpen(false)
    setAssignPermissionId("")
    setAssignScope("")
  }

  function openEditScope(row: RolePermissionMatrixRow, action: Action) {
    const status = row.actions[action]
    if (!status?.assigned) return
    setEditingCell({ resource: row.resource, action, status })
    setEditScope((status.scope as RoleScope) ?? "all")
  }

  async function handleEditScopeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingCell || !editScope) return

    setEditPending(true)
    setError(null)

    const result = await updateRolePermissionScope(
      roleId,
      editingCell.status.permissionId,
      editScope as RoleScope,
    )
    setEditPending(false)

    if (!result.success) {
      setError(result.error ?? "Failed to update scope")
      return
    }

    setMatrix((prev) =>
      prev.map((row) => {
        const newActions = { ...row.actions }
        for (const action of actionsEnum) {
          const s = newActions[action]
          if (s && s.permissionId === editingCell.status.permissionId) {
            newActions[action] = { ...s, scope: editScope as RoleScope }
          }
        }
        return { ...row, actions: newActions }
      }),
    )

    setEditingCell(null)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Role</h1>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  if (error && !role) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Role</h1>
          <p className="text-muted-foreground mt-2">Role details.</p>
        </div>
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-tight">{role?.name}</h1>
          <p className="text-muted-foreground mt-2">Role permissions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog
            open={isAssignOpen}
            onOpenChange={(open) => {
              if (!open) {
                setAssignPermissionId("")
                setAssignScope("")
              }
              setIsAssignOpen(open)
            }}
          >
            <DialogContent>
              <form onSubmit={handleAssignSubmit}>
                <DialogHeader>
                  <DialogTitle>Assign Permission</DialogTitle>
                  <DialogDescription>
                    Assign an existing permission to this role.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="assign-permission"
                      className="text-sm font-medium"
                    >
                      Permission
                    </label>
                    <Select
                      value={assignPermissionId}
                      onValueChange={(v) => setAssignPermissionId(v ?? "")}
                    >
                      <SelectTrigger id="assign-permission" className="w-full">
                        <SelectValue placeholder="Select permission" />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedPermissions.map((p) => (
                          <SelectItem
                            key={p.permissionId}
                            value={String(p.permissionId)}
                          >
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="assign-scope"
                      className="text-sm font-medium"
                    >
                      Scope
                    </label>
                    <Select
                      value={assignScope}
                      onValueChange={(v) => v && setAssignScope(v as RoleScope)}
                    >
                      <SelectTrigger id="assign-scope" className="w-full">
                        <SelectValue placeholder="Select scope" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleScopes.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
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
                    onClick={() => setIsAssignOpen(false)}
                    disabled={assignPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={assignPending || !assignPermissionId || !assignScope}
                  >
                    {assignPending ? "Assigning..." : "Assign"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button
            onClick={() => setIsAssignOpen(true)}
            disabled={unassignedPermissions.length === 0}
          >
            <PlusIcon className="size-4" />
            Assign Permission
          </Button>
          <Link
            href="/my/users/roles"
            className={buttonVariants({ variant: "outline" })}
          >
            Back to roles
          </Link>
        </div>
      </div>

      {error && !isAssignOpen && !editingCell && (
        <p className="text-destructive">{error}</p>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/80">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Resource Name
              </TableHead>
              {actionsEnum.map((action) => (
                <TableHead
                  key={action}
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrix.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={actionsEnum.length + 1}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            ) : (
              matrix.map((row, index) => (
                <TableRow
                  key={row.resource}
                  className={
                    index % 2 === 1
                      ? "bg-muted/12 hover:bg-primary/5"
                      : "hover:bg-primary/5"
                  }
                >
                  <TableCell>{row.displayResource}</TableCell>
                  {actionsEnum.map((action) => {
                    const status = row.actions[action]
                    return (
                      <TableCell key={action}>
                        {status ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="size-4 rounded border-input"
                              checked={status.assigned}
                              onChange={() => handleToggle(status)}
                              aria-label={`${action} permission for ${row.resource}`}
                            />
                            {status.assigned && status.scope && (
                              <button
                                type="button"
                                onClick={() => openEditScope(row, action)}
                                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                              >
                                {status.scope}
                                <PencilIcon className="size-2.5" />
                              </button>
                            )}
                          </div>
                        ) : null}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={editingCell !== null}
        onOpenChange={(open) => {
          if (!open) setEditingCell(null)
        }}
      >
        <DialogContent>
          <form onSubmit={handleEditScopeSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Scope</DialogTitle>
              <DialogDescription>
                Update the scope for{" "}
                <span className="font-medium">
                  {editingCell?.status.permissionId
                    ? matrix
                        .flatMap((r) =>
                          actionsEnum.map((a) => ({
                            resource: r.displayResource,
                            action: a,
                            status: r.actions[a],
                          })),
                        )
                        .find(
                          (c) =>
                            c.status?.permissionId ===
                            editingCell?.status.permissionId,
                        )
                        ?.resource ?? ""
                    : ""}
                </span>{" "}
                → {editingCell?.action}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-1.5">
                <label htmlFor="edit-scope" className="text-sm font-medium">
                  Scope
                </label>
                <Select
                  value={editScope}
                  onValueChange={(v) => v && setEditScope(v as RoleScope)}
                >
                  <SelectTrigger id="edit-scope" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleScopes.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && (
                <p className="mt-2 text-sm text-destructive">{error}</p>
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
              <Button type="submit" disabled={editPending || !editScope}>
                {editPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
