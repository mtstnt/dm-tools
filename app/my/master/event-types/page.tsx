"use client"

import { useEffect, useState } from "react"
import {
  getEventTypes,
  createEventType,
  updateEventType,
  deleteEventType,
  type EventType,
} from "@/actions/master/event-types"
import { MasterCrudPage } from "@/components/custom/master-crud-page"
import { type DataTableColumnDef } from "@/components/custom/data-table"

export default function EventTypesPage() {
  const [items, setItems] = useState<EventType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const result = await getEventTypes()

      if (!result.success || !result.data) {
        setError(result.error ?? "Failed to load event types")
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
        <h1 className="font-display text-3xl tracking-tight">Event Types</h1>
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  const columns: DataTableColumnDef<EventType, unknown>[] = [
    {
      accessorKey: "name",
      header: "Name",
      meta: { sortMethod: "string" },
    },
  ]

  return (
    <MasterCrudPage
      title="Event Types"
      description="Manage event types."
      resourceLabel="Event Type"
      columns={columns}
      data={items}
      fields={[{ name: "name", label: "Name", type: "text", required: true }]}
      searchColumn="name"
      loading={loading}
      onCreateAction={createEventType}
      onUpdateAction={updateEventType}
      onDeleteAction={deleteEventType}
    />
  )
}
