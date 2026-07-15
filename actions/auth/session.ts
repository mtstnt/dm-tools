"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import {
  permissions,
  roles,
  rolePermissions,
  userPermissions,
  users,
  type Action,
} from "@/db/schema";
import { getCurrentUser } from "@/actions/auth/current-user";
import { getFirebaseCredentials } from "@/actions/auth/firebase-auth";

export type UserPermission = {
  resource: string;
  action: Action;
};

export type UserSession = {
  id: number;
  email: string;
  fullName: string;
  nij: string;
  roles: string[];
  permissions: UserPermission[];
  firebaseCredentials?: string | null;
};

export async function getUserSession(): Promise<UserSession | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const userId = user.id;

  const roleRows = await db
    .select({ id: roles.id, name: roles.name })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId));

  const roleNames = roleRows.map((row) => row.name);

  const directPermissionRows = await db
    .select({
      resource: permissions.resource,
      action: permissions.action,
    })
    .from(userPermissions)
    .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
    .where(eq(userPermissions.userId, userId));

  let rolePermissionRows: UserPermission[] = [];

  const roleId = roleRows[0]?.id;
  if (roleId) {
    const rows = await db
      .select({
        resource: permissions.resource,
        action: permissions.action,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));

    rolePermissionRows = rows;
  }

  const permissionMap = new Map<string, UserPermission>();

  for (const permission of directPermissionRows) {
    const key = `${permission.resource}:${permission.action}`;
    permissionMap.set(key, permission);
  }

  for (const permission of rolePermissionRows) {
    const key = `${permission.resource}:${permission.action}`;
    permissionMap.set(key, permission);
  }

  const firebaseCredentials = await getFirebaseCredentials();

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    nij: user.nij,
    roles: roleNames,
    permissions: Array.from(permissionMap.values()),
    firebaseCredentials,
  };
}
