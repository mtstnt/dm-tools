"use client"

import * as React from "react"

import { getPermissions } from "@/actions/users/permissions"
import { DataTable, type DataTableColumnDef } from "@/components/custom/data-table"
import { actionsEnum, type Action } from "@/db/schema"

type PermissionRow = {
  resource: string
  displayResource: string
  create: boolean
  read: boolean
  update: boolean
  delete: boolean
  execute: boolean
}

function formatResourceName(resource: string): string {
  return resource
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function buildPermissionRows(
  permissions: { resource: string; action: Action }[],
): PermissionRow[] {
  const grouped = new Map<string, Set<Action>>()

  for (const permission of permissions) {
    const actions = grouped.get(permission.resource) ?? new Set<Action>()
    actions.add(permission.action)
    grouped.set(permission.resource, actions)
  }

  const rows: PermissionRow[] = []
  for (const [resource, actions] of grouped) {
    rows.push({
      resource,
      displayResource: formatResourceName(resource),
      create: actions.has("create"),
      read: actions.has("read"),
      update: actions.has("update"),
      delete: actions.has("delete"),
      execute: actions.has("execute"),
    })
  }

  return rows.sort((a, b) => a.resource.localeCompare(b.resource))
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
    cell: ({ row }: { row: { original: PermissionRow } }) => (
      <input
        type="checkbox"
        className="size-4 rounded border-input"
        checked={row.original[action]}
        disabled
        aria-label={`${action} permission for ${row.original.resource}`}
      />
    ),
    enableSorting: false,
  })),
]

export default function PermissionsPage() {
  const [rows, setRows] = React.useState<PermissionRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Permissions</h1>
        <p className="text-muted-foreground mt-2">Manage permissions.</p>
      </div>
      {error && (
        <p className="text-destructive">
          {error}
        </p>
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
    </div>
  )
}
