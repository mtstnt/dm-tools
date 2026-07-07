"use client"

import * as React from "react"
import Link from "next/link"
import { PencilIcon, TrashIcon } from "lucide-react"

import { getRoles, deleteRole, type Role } from "@/actions/users/roles"
import { DataTable, type DataTableColumnDef } from "@/components/custom/data-table"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function RolesPage() {
  const [roles, setRoles] = React.useState<Role[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [deletingRole, setDeletingRole] = React.useState<Role | null>(null)
  const [deletePending, setDeletePending] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const result = await getRoles()

      if (cancelled) return

      if (!result.success || !result.data) {
        setError(result.error ?? "Failed to load roles")
        setRoles([])
      } else {
        setRoles(result.data)
      }

      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleDeleteConfirm() {
    if (!deletingRole) return

    setDeletePending(true)
    const result = await deleteRole(deletingRole.id)
    setDeletePending(false)

    if (!result.success) {
      setError(result.error ?? "Failed to delete role")
      return
    }

    setRoles((prev) => prev.filter((role) => role.id !== deletingRole.id))
    setDeletingRole(null)
  }

  const columns: DataTableColumnDef<Role, unknown>[] = [
    {
      accessorKey: "name",
      header: "Name",
      meta: { sortMethod: "string" },
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const role = row.original
        return (
          <div className="flex items-center gap-1">
            <Link
              href={`/my/users/roles/${role.id}`}
              className={buttonVariants({
                variant: "ghost",
                size: "icon-sm",
              })}
            >
              <PencilIcon className="size-3.5" />
              <span className="sr-only">Edit</span>
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeletingRole(role)}
            >
              <TrashIcon className="size-3.5" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Roles</h1>
        <p className="text-muted-foreground mt-2">Manage roles and their permissions.</p>
      </div>

      {error && (
        <p className="text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="text-muted-foreground">Loading roles...</div>
      ) : (
        <DataTable
          columns={columns}
          data={roles}
          searchColumn="name"
          searchPlaceholder="Search role..."
          defaultSortColumn="name"
        />
      )}

      <Dialog
        open={deletingRole !== null}
        onOpenChange={(open) => !open && setDeletingRole(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role &quot;{deletingRole?.name}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingRole(null)}
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
