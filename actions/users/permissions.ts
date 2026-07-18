"use server";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { permissions, actionsEnum, type Action } from "@/db/schema";
import { getUserContext, logAuditTrail } from "@/actions/master/_shared";

export type Permission = {
  id: number;
  resource: string;
  action: Action;
};

export type PermissionListResult = {
  success: boolean;
  data?: Permission[];
  error?: string;
};

export type PermissionMutationResult = {
  success: boolean;
  data?: Permission;
  error?: string;
};

export async function getPermissions(): Promise<PermissionListResult> {
  try {
    const rows = await db
      .select({
        id: permissions.id,
        resource: permissions.resource,
        action: permissions.action,
      })
      .from(permissions)
      .orderBy(asc(permissions.resource), asc(permissions.action));

    return { success: true, data: rows };
  } catch (err) {
    console.error("[getPermissions] error:", err);
    return { success: false, error: "Failed to load permissions" };
  }
}

export async function createPermission(
  resource: string,
  action: Action,
): Promise<PermissionMutationResult> {
  try {
    const ctx = await getUserContext();
    const now = new Date();

    const result = await db
      .insert(permissions)
      .values({
        resource: resource.trim(),
        action,
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      })
      .returning({
        id: permissions.id,
        resource: permissions.resource,
        action: permissions.action,
      });

    const row = result[0];
    await logAuditTrail("permissions", row.id, "create", {}, row);

    return { success: true, data: row };
  } catch (err) {
    console.error("[createPermission] error:", err);
    return { success: false, error: "Failed to create permission" };
  }
}

export async function updatePermission(
  id: number,
  resource: string,
  action: Action,
): Promise<PermissionMutationResult> {
  try {
    const ctx = await getUserContext();

    const existing = await db
      .select()
      .from(permissions)
      .where(eq(permissions.id, id))
      .limit(1);

    if (existing.length === 0) {
      return { success: false, error: "Permission not found" };
    }

    const result = await db
      .update(permissions)
      .set({
        resource: resource.trim(),
        action,
        updatedAt: new Date(),
        updatedBy: ctx.userId,
      })
      .where(eq(permissions.id, id))
      .returning({
        id: permissions.id,
        resource: permissions.resource,
        action: permissions.action,
      });

    const row = result[0];
    await logAuditTrail("permissions", row.id, "update", existing[0], row);

    return { success: true, data: row };
  } catch (err) {
    console.error("[updatePermission] error:", err);
    return { success: false, error: "Failed to update permission" };
  }
}

export async function deletePermission(
  id: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await db
      .select()
      .from(permissions)
      .where(eq(permissions.id, id))
      .limit(1);

    if (existing.length === 0) {
      return { success: false, error: "Permission not found" };
    }

    await db.delete(permissions).where(eq(permissions.id, id));
    await logAuditTrail("permissions", id, "delete", existing[0], {});

    return { success: true };
  } catch (err) {
    console.error("[deletePermission] error:", err);
    return { success: false, error: "Failed to delete permission" };
  }
}
