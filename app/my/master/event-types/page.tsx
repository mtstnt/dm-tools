import {
  getEventTypes,
  createEventType,
  updateEventType,
  deleteEventType,
  type EventType,
} from "@/actions/master/event-types"
import { MasterCrudPage } from "@/components/custom/master-crud-page"
import { type DataTableColumnDef } from "@/components/custom/data-table"

export default async function EventTypesPage() {
  const result = await getEventTypes()

  if (!result.success || !result.data) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl tracking-tight">Event Types</h1>
        <p className="text-destructive">
          {result.error ?? "Failed to load event types"}
        </p>
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
      data={result.data}
      fields={[{ name: "name", label: "Name", type: "text", required: true }]}
      searchColumn="name"
      onCreateAction={createEventType}
      onUpdateAction={updateEventType}
      onDeleteAction={deleteEventType}
    />
  )
}
