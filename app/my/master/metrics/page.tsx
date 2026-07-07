"use client"

import { useEffect, useState } from "react"
import {
  getMetrics,
  createMetric,
  updateMetric,
  deleteMetric,
  type Metric,
} from "@/actions/master/metrics"
import { MasterCrudPage } from "@/components/custom/master-crud-page"
import { type DataTableColumnDef } from "@/components/custom/data-table"

export default function MetricsPage() {
  const [items, setItems] = useState<Metric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const result = await getMetrics()

      if (!result.success || !result.data) {
        setError(result.error ?? "Failed to load metrics")
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
        <h1 className="font-display text-3xl tracking-tight">Metrics</h1>
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  const columns: DataTableColumnDef<Metric, unknown>[] = [
    {
      accessorKey: "name",
      header: "Name",
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
      title="Metrics"
      description="Manage metrics."
      resourceLabel="Metric"
      columns={columns}
      data={items}
      fields={[
        { name: "name", label: "Name", type: "text", required: true },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
      searchColumn="name"
      loading={loading}
      onCreateAction={createMetric}
      onUpdateAction={updateMetric}
      onDeleteAction={deleteMetric}
    />
  )
}
