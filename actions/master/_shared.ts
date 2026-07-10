"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db/connection";
import {
  auditTrails,
  permissions,
  roles,
  userPermissions,
  users,
  rolePermissions,
  type Action,
} from "@/db/schema";
import { getCurrentUser } from "@/actions/auth/current-user";

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

export async function checkPermission(
  resource: string,
  action: Action,
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) {
    return false;
  }

  const userId = user.id;

  // ADMIN role grants full access
  const adminRoleRows = await db
    .select({ roleId: users.roleId })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(users.id, userId), eq(roles.name, "ADMIN")))
    .limit(1);

  if (adminRoleRows.length > 0) {
    return true;
  }

  // Find the permission record for the resource/action
  const permissionRows = await db
    .select({ id: permissions.id })
    .from(permissions)
    .where(and(eq(permissions.resource, resource), eq(permissions.action, action)))
    .limit(1);

  if (permissionRows.length === 0) {
    return false;
  }

  const permissionId = permissionRows[0].id;

  // Check direct user permission
  const directPermissionRows = await db
    .select({ id: userPermissions.id })
    .from(userPermissions)
    .where(
      and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.permissionId, permissionId),
      ),
    )
    .limit(1);

  if (directPermissionRows.length > 0) {
    return true;
  }

  // Check role-based permissions
  const rolePermissionRows = await db
    .select({ id: rolePermissions.id })
    .from(rolePermissions)
    .innerJoin(users, eq(rolePermissions.roleId, users.roleId))
    .where(
      and(
        eq(users.id, userId),
        eq(rolePermissions.permissionId, permissionId),
      ),
    )
    .limit(1);

  return rolePermissionRows.length > 0;
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
