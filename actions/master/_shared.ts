"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { auditTrails, roles, users } from "@/db/schema";
import { getCurrentUser } from "@/actions/auth/current-user";
import { canAccess, type Role } from "@/lib/permissions";

export async function getUserContext(): Promise<{
  userId: string;
  userName: string;
}> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return { userId: String(user.id), userName: user.fullName };
}

export async function getUserRole(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const rows = await db
    .select({ name: roles.name })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, user.id));

  return rows[0]?.name ?? null;
}

export async function requireRole(allowedRoles: Role[]): Promise<void> {
  const role = await getUserRole();
  if (!canAccess(role, allowedRoles)) {
    throw new Error("Forbidden");
  }
}

export async function logAuditTrail(
  resource: string,
  recordId: number,
  action: string,
  oldData: unknown,
  newData: unknown,
) {
  const ctx = await getUserContext();
  await db.insert(auditTrails).values({
    resource,
    recordId,
    action,
    userId: Number(ctx.userId),
    userName: ctx.userName,
    oldData: JSON.stringify(oldData ?? {}),
    newData: JSON.stringify(newData ?? {}),
    changedAt: new Date(),
  });
}
