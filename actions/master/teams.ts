"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/connection";
import { teams, regions } from "@/db/schema";
import { getUserRole, getUserContext, logAuditTrail } from "./_shared";
import { ROLES, canAccess } from "@/lib/permissions";

const teamSchema = z.object({
  number: z.coerce.number().int().positive("Team number is required"),
  regionId: z.coerce.number().int().positive("Region is required"),
});

export type Team = {
  id: number;
  number: number;
  regionId: number;
  regionName?: string;
};

export type TeamListResult = {
  success: boolean;
  data?: Team[];
  error?: string;
};

export type TeamDetailResult = {
  success: boolean;
  data?: Team;
  error?: string;
};

export type TeamMutationResult = {
  success: boolean;
  data?: Team;
  error?: string;
};

export async function getTeams(): Promise<TeamListResult> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC, ROLES.SPV]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const rows = await db
      .select({
        id: teams.id,
        number: teams.number,
        regionId: teams.regionId,
        regionName: regions.name,
      })
      .from(teams)
      .innerJoin(regions, eq(teams.regionId, regions.id))
      .orderBy(teams.number);

    return { success: true, data: rows };
  } catch (err) {
    console.error("[getTeams] error:", err);
    return { success: false, error: "Failed to load teams" };
  }
}

export async function getTeamById(
  id: number,
): Promise<TeamDetailResult> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC, ROLES.SPV]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const rows = await db
      .select({
        id: teams.id,
        number: teams.number,
        regionId: teams.regionId,
      })
      .from(teams)
      .where(eq(teams.id, id))
      .limit(1);

    if (rows.length === 0) {
      return { success: false, error: "Team not found" };
    }

    return { success: true, data: rows[0] };
  } catch (err) {
    console.error("[getTeamById] error:", err);
    return { success: false, error: "Failed to load team" };
  }
}

export async function createTeam(
  input: Record<string, string>,
): Promise<TeamMutationResult> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN, ROLES.HEAD_MINISTRY]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const parseResult = teamSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map((err) => err.message).join(", "),
    };
  }

  const { number, regionId } = parseResult.data;

  try {
    const ctx = await getUserContext();
    const now = new Date();

    const result = await db
      .insert(teams)
      .values({
        number,
        regionId,
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      })
      .returning({
        id: teams.id,
        number: teams.number,
        regionId: teams.regionId,
      });

    const row = result[0];
    await logAuditTrail("teams", row.id, "create", {}, row);

    return { success: true, data: row };
  } catch (err) {
    console.error("[createTeam] error:", err);
    return { success: false, error: "Failed to create team" };
  }
}

export async function updateTeam(
  id: number,
  input: Record<string, string>,
): Promise<TeamMutationResult> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN, ROLES.HEAD_MINISTRY]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const parseResult = teamSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map((err) => err.message).join(", "),
    };
  }

  const { number, regionId } = parseResult.data;

  try {
    const ctx = await getUserContext();
    const existing = await getTeamById(id);
    if (!existing.success || !existing.data) {
      return { success: false, error: "Team not found" };
    }

    const result = await db
      .update(teams)
      .set({
        number,
        regionId,
        updatedAt: new Date(),
        updatedBy: ctx.userId,
      })
      .where(eq(teams.id, id))
      .returning({
        id: teams.id,
        number: teams.number,
        regionId: teams.regionId,
      });

    const row = result[0];
    await logAuditTrail("teams", row.id, "update", existing.data, row);

    return { success: true, data: row };
  } catch (err) {
    console.error("[updateTeam] error:", err);
    return { success: false, error: "Failed to update team" };
  }
}

export async function deleteTeam(
  id: number,
): Promise<{ success: boolean; error?: string }> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN, ROLES.HEAD_MINISTRY]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const existing = await getTeamById(id);
    if (!existing.success || !existing.data) {
      return { success: false, error: "Team not found" };
    }

    await db.delete(teams).where(eq(teams.id, id));
    await logAuditTrail("teams", id, "delete", existing.data, {});

    return { success: true };
  } catch (err) {
    console.error("[deleteTeam] error:", err);
    return { success: false, error: "Failed to delete team" };
  }
}
