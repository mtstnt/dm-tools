"use server";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/connection";
import { roles } from "@/db/schema";
import { getUserRole, getUserContext, logAuditTrail } from "@/actions/master/_shared";
import { ROLES, canAccess } from "@/lib/permissions";

export type Role = {
  id: number;
  name: string;
};

export type RoleListResult = {
  success: boolean;
  data?: Role[];
  error?: string;
};

export type RoleMutationResult = {
  success: boolean;
  data?: Role;
  error?: string;
};

const roleSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
});

export async function getRoles(): Promise<RoleListResult> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN]);
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
      .orderBy(
        sql`CASE ${roles.name}
          WHEN 'Admin' THEN 1
          WHEN 'Head Ministry' THEN 2
          WHEN 'Regional PIC' THEN 3
          WHEN 'SPV' THEN 4
          WHEN 'Member' THEN 5
          ELSE 6
        END`,
      );

    return { success: true, data: rows };
  } catch (err) {
    console.error("[getRoles] error:", err);
    return { success: false, error: "Failed to load roles" };
  }
}

export async function createRole(
  input: Record<string, string>,
): Promise<RoleMutationResult> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const parseResult = roleSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map((err) => err.message).join(", "),
    };
  }

  const { name } = parseResult.data;

  try {
    const ctx = await getUserContext();
    const now = new Date();

    const result = await db
      .insert(roles)
      .values({
        name,
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      })
      .returning({ id: roles.id, name: roles.name });

    const row = result[0];
    await logAuditTrail("roles", row.id, "create", {}, row);

    return { success: true, data: row };
  } catch (err) {
    console.error("[createRole] error:", err);
    return { success: false, error: "Failed to create role" };
  }
}

export async function updateRole(
  id: number,
  input: Record<string, string>,
): Promise<RoleMutationResult> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const parseResult = roleSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map((err) => err.message).join(", "),
    };
  }

  const { name } = parseResult.data;

  try {
    const ctx = await getUserContext();

    const existingRows = await db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1);

    if (existingRows.length === 0) {
      return { success: false, error: "Role not found" };
    }

    const existing = existingRows[0];

    const result = await db
      .update(roles)
      .set({
        name,
        updatedAt: new Date(),
        updatedBy: ctx.userId,
      })
      .where(eq(roles.id, id))
      .returning({ id: roles.id, name: roles.name });

    const row = result[0];
    await logAuditTrail("roles", row.id, "update", existing, row);

    return { success: true, data: row };
  } catch (err) {
    console.error("[updateRole] error:", err);
    return { success: false, error: "Failed to update role" };
  }
}

export async function deleteRole(
  id: number,
): Promise<{ success: boolean; error?: string }> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const existingRows = await db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1);

    if (existingRows.length === 0) {
      return { success: false, error: "Role not found" };
    }

    const existing = existingRows[0];

    await db.delete(roles).where(eq(roles.id, id));
    await logAuditTrail("roles", id, "delete", existing, {});

    return { success: true };
  } catch (err) {
    console.error("[deleteRole] error:", err);
    return { success: false, error: "Failed to delete role" };
  }
}
