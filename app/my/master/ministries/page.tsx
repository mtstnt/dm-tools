import {
  getMinistries,
  createMinistry,
  updateMinistry,
  deleteMinistry,
  type Ministry,
} from "@/actions/master/ministries"
import { MasterCrudPage } from "@/components/custom/master-crud-page"
import { type DataTableColumnDef } from "@/components/custom/data-table"

export default async function MinistriesPage() {
  const result = await getMinistries()

  if (!result.success || !result.data) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl tracking-tight">Ministries</h1>
        <p className="text-destructive">
          {result.error ?? "Failed to load ministries"}
        </p>
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
      data={result.data}
      fields={[{ name: "name", label: "Name", type: "text", required: true }]}
      searchColumn="name"
      onCreateAction={createMinistry}
      onUpdateAction={updateMinistry}
      onDeleteAction={deleteMinistry}
    />
  )
}
