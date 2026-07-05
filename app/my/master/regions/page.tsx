"use client"

import { useEffect, useState } from "react"
import {
  getRegions,
  createRegion,
  updateRegion,
  deleteRegion,
  type Region,
} from "@/actions/master/regions"
import { MasterCrudPage } from "@/components/custom/master-crud-page"
import { type DataTableColumnDef } from "@/components/custom/data-table"

export default function RegionsPage() {
  const [items, setItems] = useState<Region[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const result = await getRegions()

      if (!result.success || !result.data) {
        setError(result.error ?? "Failed to load regions")
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
        <h1 className="font-display text-3xl tracking-tight">Regions</h1>
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  const columns: DataTableColumnDef<Region, unknown>[] = [
    {
      accessorKey: "name",
      header: "Name",
      meta: { sortMethod: "string" },
    },
  ]

  return (
    <MasterCrudPage
      title="Regions"
      description="Manage regions."
      resourceLabel="Region"
      columns={columns}
      data={items}
      fields={[{ name: "name", label: "Name", type: "text", required: true }]}
      searchColumn="name"
      loading={loading}
      onCreateAction={createRegion}
      onUpdateAction={updateRegion}
      onDeleteAction={deleteRegion}
    />
  )
}
