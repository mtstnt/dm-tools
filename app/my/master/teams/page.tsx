import {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  type Team,
} from "@/actions/master/teams"
import { getRegions } from "@/actions/master/regions"
import { MasterCrudPage } from "@/components/custom/master-crud-page"
import { type DataTableColumnDef } from "@/components/custom/data-table"

export default async function TeamsPage() {
  const [teamsResult, regionsResult] = await Promise.all([
    getTeams(),
    getRegions(),
  ])

  if (!teamsResult.success || !teamsResult.data) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl tracking-tight">Teams</h1>
        <p className="text-destructive">
          {teamsResult.error ?? "Failed to load teams"}
        </p>
      </div>
    )
  }

  if (!regionsResult.success || !regionsResult.data) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl tracking-tight">Teams</h1>
        <p className="text-destructive">
          {regionsResult.error ?? "Failed to load regions"}
        </p>
      </div>
    )
  }

  const regionOptions = regionsResult.data.map((region) => ({
    value: String(region.id),
    label: region.name,
  }))

  const columns: DataTableColumnDef<Team, unknown>[] = [
    {
      accessorKey: "name",
      header: "Name",
      meta: { sortMethod: "numeric" },
    },
    {
      accessorKey: "regionName",
      header: "Region",
      meta: { sortMethod: "string" },
    },
  ]

  return (
    <MasterCrudPage
      title="Teams"
      description="Manage teams."
      resourceLabel="Team"
      columns={columns}
      data={teamsResult.data}
      fields={[
        { name: "name", label: "Name", type: "text", required: true },
        {
          name: "regionId",
          label: "Region",
          type: "select",
          required: true,
          options: regionOptions,
        },
      ]}
      searchColumn="name"
      defaultSortColumn="name"
      defaultSortDirection="asc"
      onCreateAction={createTeam}
      onUpdateAction={updateTeam}
      onDeleteAction={deleteTeam}
    />
  )
}
