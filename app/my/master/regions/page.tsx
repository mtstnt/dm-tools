import {
  getRegions,
  createRegion,
  updateRegion,
  deleteRegion,
  type Region,
} from "@/actions/master/regions"
import { MasterCrudPage } from "@/components/custom/master-crud-page"
import { type DataTableColumnDef } from "@/components/custom/data-table"

export default async function RegionsPage() {
  const result = await getRegions()

  if (!result.success || !result.data) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl tracking-tight">Regions</h1>
        <p className="text-destructive">
          {result.error ?? "Failed to load regions"}
        </p>
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
      data={result.data}
      fields={[{ name: "name", label: "Name", type: "text", required: true }]}
      searchColumn="name"
      onCreateAction={createRegion}
      onUpdateAction={updateRegion}
      onDeleteAction={deleteRegion}
    />
  )
}
