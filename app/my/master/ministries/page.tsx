"use client"

import { useEffect, useState } from "react"
import {
  getMinistries,
  createMinistry,
  updateMinistry,
  deleteMinistry,
  type Ministry,
} from "@/actions/master/ministries"
import { MasterCrudPage } from "@/components/custom/master-crud-page"
import { type DataTableColumnDef } from "@/components/custom/data-table"

export default function MinistriesPage() {
  const [items, setItems] = useState<Ministry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const result = await getMinistries()

      if (!result.success || !result.data) {
        setError(result.error ?? "Failed to load ministries")
        setLoading(false)
        return
      }

      setItems(result.data)
      setLoading(false)
    }

    load()
  }, [])

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl tracking-tight">Ministries</h1>
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  const columns: DataTableColumnDef<Ministry, unknown>[] = [
    {
      accessorKey: "name",
      header: "Name",
      meta: { sortMethod: "string" },
    },
  ]

  return (
    <MasterCrudPage
      title="Ministries"
      description="Manage ministries."
      resourceLabel="Ministry"
      columns={columns}
      data={items}
      fields={[{ name: "name", label: "Name", type: "text", required: true }]}
      searchColumn="name"
      loading={loading}
      onCreateAction={createMinistry}
      onUpdateAction={updateMinistry}
      onDeleteAction={deleteMinistry}
    />
  )
}
