import {
  getMetrics,
  createMetric,
  updateMetric,
  deleteMetric,
  type Metric,
} from "@/actions/master/metrics"
import { MasterCrudPage } from "@/components/custom/master-crud-page"
import { type DataTableColumnDef } from "@/components/custom/data-table"

export default async function MetricsPage() {
  const result = await getMetrics()

  if (!result.success || !result.data) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl tracking-tight">Metrics</h1>
        <p className="text-destructive">
          {result.error ?? "Failed to load metrics"}
        </p>
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
      data={result.data}
      fields={[
        { name: "name", label: "Name", type: "text", required: true },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
      searchColumn="name"
      onCreateAction={createMetric}
      onUpdateAction={updateMetric}
      onDeleteAction={deleteMetric}
    />
  )
}
