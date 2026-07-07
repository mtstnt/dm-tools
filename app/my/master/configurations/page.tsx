"use client"

import { useEffect, useState } from "react"
import {
  getConfigurations,
  createConfiguration,
  updateConfiguration,
  deleteConfiguration,
  type Configuration,
} from "@/actions/master/configurations"
import { MasterCrudPage } from "@/components/custom/master-crud-page"
import { type DataTableColumnDef } from "@/components/custom/data-table"

export default function ConfigurationsPage() {
  const [items, setItems] = useState<Configuration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const result = await getConfigurations()

      if (!result.success || !result.data) {
        setError(result.error ?? "Failed to load configurations")
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
        <h1 className="font-display text-3xl tracking-tight">Configurations</h1>
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  const columns: DataTableColumnDef<Configuration, unknown>[] = [
    {
      accessorKey: "name",
      header: "Name",
      meta: { sortMethod: "string" },
    },
    {
      accessorKey: "value",
      header: "Value",
      meta: { sortMethod: "string" },
    },
    {
      accessorKey: "notes",
      header: "Notes",
      meta: { sortMethod: "string" },
    },
  ]

  return (
    <MasterCrudPage
      title="Configurations"
      description="Manage application configurations."
      resourceLabel="Configuration"
      columns={columns}
      data={items}
      fields={[
        { name: "name", label: "Name", type: "text", required: true },
        { name: "value", label: "Value", type: "textarea", required: true },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
      searchColumn="name"
      loading={loading}
      onCreateAction={createConfiguration}
      onUpdateAction={updateConfiguration}
      onDeleteAction={deleteConfiguration}
    />
  )
}
