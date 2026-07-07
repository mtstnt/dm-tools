"use server";

import { asc } from "drizzle-orm";
import { db } from "@/db/connection";
import { permissions, type Action } from "@/db/schema";
import { checkPermission } from "@/actions/master/_shared";

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

export async function getPermissions(): Promise<PermissionListResult> {
  const allowed = await checkPermission("permissions", "read");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

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
