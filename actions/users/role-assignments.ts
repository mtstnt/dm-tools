"use server";

import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/connection";
import { roles, teams, users } from "@/db/schema";
import { getUserRole, getUserContext, logAuditTrail } from "@/actions/master/_shared";
import { ROLES, canAccess } from "@/lib/permissions";

export type UserRoleAssignment = {
  id: number;
  fullName: string;
  nij: string;
  email: string;
  teamNumber: number | null;
  roleId: number;
  roleName: string;
};

export type UserRoleAssignmentsResult = {
  success: boolean;
  data?: UserRoleAssignment[];
  error?: string;
};

export async function getUserRoleAssignments(): Promise<UserRoleAssignmentsResult> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const rows = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        nij: users.nij,
        email: users.email,
        teamNumber: teams.number,
        roleId: roles.id,
        roleName: roles.name,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(teams, eq(users.teamId, teams.id))
      .orderBy(
        sql`CASE ${roles.name}
          WHEN 'Admin' THEN 1
          WHEN 'Head Ministry' THEN 2
          WHEN 'Regional PIC' THEN 3
          WHEN 'SPV' THEN 4
          WHEN 'Member' THEN 5
          ELSE 6
        END`,
        asc(users.fullName),
      );

    return { success: true, data: rows };
  } catch (err) {
    console.error("[getUserRoleAssignments] error:", err);
    return { success: false, error: "Failed to load user role assignments" };
  }
}

export async function updateUserRole(
  userId: number,
  roleId: number,
): Promise<{ success: boolean; error?: string }> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const ctx = await getUserContext();

    const existingRows = await db
      .select({ id: users.id, fullName: users.fullName, roleId: users.roleId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingRows.length === 0) {
      return { success: false, error: "User not found" };
    }

    const existing = existingRows[0];

    await db
      .update(users)
      .set({ roleId, updatedAt: new Date(), updatedBy: ctx.userId })
      .where(eq(users.id, userId));

    await logAuditTrail("users", userId, "update", existing, {
      ...existing,
      roleId,
    });

    return { success: true };
  } catch (err) {
    console.error("[updateUserRole] error:", err);
    return { success: false, error: "Failed to update user role" };
  }
}
