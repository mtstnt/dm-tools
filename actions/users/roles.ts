"use server";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { permissions, roles, rolePermissions, type Action, type RoleScope } from "@/db/schema";
import { checkPermission, getUserContext, logAuditTrail } from "@/actions/master/_shared";

export type Role = {
  id: number;
  name: string;
};

export type RoleListResult = {
  success: boolean;
  data?: Role[];
  error?: string;
};

export type ActionStatus = {
  permissionId: number;
  exists: boolean;
  assigned: boolean;
  scope: string | null;
};

export type RolePermissionMatrixRow = {
  resource: string;
  displayResource: string;
  actions: Record<Action, ActionStatus | undefined>;
};

export type RolePermissionsResult = {
  success: boolean;
  data?: {
    role: Role;
    matrix: RolePermissionMatrixRow[];
  };
  error?: string;
};

export type RoleDeleteResult = {
  success: boolean;
  error?: string;
};

function formatResourceName(resource: string): string {
  return resource
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function getRoles(): Promise<RoleListResult> {
  const allowed = await checkPermission("roles", "read");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const rows = await db
      .select({
        id: roles.id,
        name: roles.name,
      })
      .from(roles)
      .orderBy(asc(roles.name));

    return { success: true, data: rows };
  } catch (err) {
    console.error("[getRoles] error:", err);
    return { success: false, error: "Failed to load roles" };
  }
}

export async function getRolePermissions(roleId: number): Promise<RolePermissionsResult> {
  const allowed = await checkPermission("roles", "read");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const roleRows = await db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (roleRows.length === 0) {
      return { success: false, error: "Role not found" };
    }

    const role = roleRows[0];

    const allPermissions = await db
      .select({
        id: permissions.id,
        resource: permissions.resource,
        action: permissions.action,
      })
      .from(permissions)
      .orderBy(asc(permissions.resource), asc(permissions.action));

    const assignedPermissionRows = await db
      .select({
        permissionId: rolePermissions.permissionId,
        scope: rolePermissions.scope,
      })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));

    const assignedPermissionIds = new Set(
      assignedPermissionRows.map((row) => row.permissionId),
    );

    const assignedPermissionScopes = new Map<number, string | null>();
    for (const row of assignedPermissionRows) {
      assignedPermissionScopes.set(row.permissionId, row.scope ?? null);
    }

    const grouped = new Map<string, Map<Action, { permissionId: number; exists: boolean }>>();

    for (const permission of allPermissions) {
      const actions = grouped.get(permission.resource) ?? new Map<Action, { permissionId: number; exists: boolean }>();
      actions.set(permission.action, {
        permissionId: permission.id,
        exists: true,
      });
      grouped.set(permission.resource, actions);
    }

    const matrix: RolePermissionMatrixRow[] = [];
    for (const [resource, actionsMap] of grouped) {
      const actions: Record<Action, ActionStatus | undefined> = {
        create: undefined,
        read: undefined,
        update: undefined,
        delete: undefined,
        execute: undefined,
      };

      for (const [action, { permissionId }] of actionsMap) {
        const assigned = assignedPermissionIds.has(permissionId);
        const scope = assignedPermissionScopes.get(permissionId) ?? null;

        actions[action] = {
          permissionId,
          exists: true,
          assigned,
          scope,
        };
      }

      matrix.push({
        resource,
        displayResource: formatResourceName(resource),
        actions,
      });
    }

    return { success: true, data: { role, matrix } };
  } catch (err) {
    console.error("[getRolePermissions] error:", err);
    return { success: false, error: "Failed to load role permissions" };
  }
}

export async function deleteRole(id: number): Promise<RoleDeleteResult> {
  const allowed = await checkPermission("roles", "delete");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const existing = await db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1);

    if (existing.length === 0) {
      return { success: false, error: "Role not found" };
    }

    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
    await db.delete(roles).where(eq(roles.id, id));

    await logAuditTrail("roles", id, "delete", existing[0], {});

    return { success: true };
  } catch (err) {
    console.error("[deleteRole] error:", err);
    return { success: false, error: "Failed to delete role" };
  }
}

export async function assignRolePermission(
  roleId: number,
  permissionId: number,
  scope?: RoleScope,
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await getUserContext();
    const now = new Date();

    await db.insert(rolePermissions).values({
      roleId,
      permissionId,
      scope: scope ?? null,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });

    return { success: true };
  } catch (err) {
    console.error("[assignRolePermission] error:", err);
    return { success: false, error: "Failed to assign permission" };
  }
}

export async function unassignRolePermission(
  roleId: number,
  permissionId: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .delete(rolePermissions)
      .where(
        eq(rolePermissions.roleId, roleId) &&
          eq(rolePermissions.permissionId, permissionId),
      );

    return { success: true };
  } catch (err) {
    console.error("[unassignRolePermission] error:", err);
    return { success: false, error: "Failed to unassign permission" };
  }
}

export async function updateRolePermissionScope(
  roleId: number,
  permissionId: number,
  scope: RoleScope,
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await getUserContext();

    await db
      .update(rolePermissions)
      .set({ scope, updatedAt: new Date(), updatedBy: ctx.userId })
      .where(
        eq(rolePermissions.roleId, roleId) &&
          eq(rolePermissions.permissionId, permissionId),
      );

    return { success: true };
  } catch (err) {
    console.error("[updateRolePermissionScope] error:", err);
    return { success: false, error: "Failed to update scope" };
  }
}
