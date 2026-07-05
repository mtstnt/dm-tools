import { getTeamMembers } from "@/actions/users/members"
import { db } from "@/db/connection"
import { teams } from "@/db/schema"
import { MembersClient } from "./members-client"

export default async function MembersPage() {
  const result = await getTeamMembers()

  if (!result.success || !result.data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Members</h1>
          <p className="text-muted-foreground mt-2">View members by team.</p>
        </div>
        <p className="text-destructive">
          {result.error ?? "Failed to load members"}
        </p>
      </div>
    )
  }

  const rawTeams = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)

  const teamOptions = rawTeams
    .map((team) => ({
      ...team,
      number: Number(team.name.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER),
    }))
    .sort((a, b) => {
      if (a.number !== b.number) return a.number - b.number
      return a.name.localeCompare(b.name)
    })
    .map((team) => ({
      id: team.id,
      name: `Team ${team.name}`,
    }))

  return (
    <MembersClient
      teams={result.data.teams}
      unassigned={result.data.unassigned}
      teamOptions={teamOptions}
    />
  )
}
