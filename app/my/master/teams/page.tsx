"use client"

import { useEffect, useState } from "react"
import {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  type Team,
} from "@/actions/master/teams"
import { getRegions, type Region } from "@/actions/master/regions"
import { MasterCrudPage } from "@/components/custom/master-crud-page"
import { type DataTableColumnDef } from "@/components/custom/data-table"

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [teamsResult, regionsResult] = await Promise.all([
        getTeams(),
        getRegions(),
      ])

      if (!teamsResult.success || !teamsResult.data) {
        setError(teamsResult.error ?? "Failed to load teams")
        setLoading(false)
        return
      }

      if (!regionsResult.success || !regionsResult.data) {
        setError(regionsResult.error ?? "Failed to load regions")
        setLoading(false)
        return
      }

      setTeams(teamsResult.data)
      setRegions(regionsResult.data)
      setLoading(false)
    }

    load()
  }, [])

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl tracking-tight">Teams</h1>
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  const regionOptions = regions.map((region) => ({
    value: String(region.id),
    label: region.name,
  }))

  const columns: DataTableColumnDef<Team, unknown>[] = [
    {
      accessorKey: "number",
      header: "Team",
      cell: ({ row }) => `Team ${row.original.number}`,
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
      data={teams}
      fields={[
        { name: "number", label: "Team", type: "text", required: true },
        {
          name: "regionId",
          label: "Region",
          type: "select",
          required: true,
          options: regionOptions,
        },
      ]}
      searchColumn="number"
      defaultSortColumn="number"
      defaultSortDirection="asc"
      loading={loading}
      onCreateAction={createTeam}
      onUpdateAction={updateTeam}
      onDeleteAction={deleteTeam}
    />
  )
}
