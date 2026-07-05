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
    .select({ id: teams.id, number: teams.number })
    .from(teams)
    .orderBy(teams.number)

  const teamOptions = rawTeams.map((team) => ({
    id: team.id,
    number: team.number,
  }))

  return (
    <MembersClient
      teams={result.data.teams}
      unassigned={result.data.unassigned}
      teamOptions={teamOptions}
    />
  )
}
