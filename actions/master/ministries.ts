"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/connection";
import { ministries } from "@/db/schema";
import { getUserRole, getUserContext, logAuditTrail } from "./_shared";
import { ROLES, canAccess } from "@/lib/permissions";

const ministrySchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
});

export type Ministry = {
  id: number;
  name: string;
};

export type MinistryListResult = {
  success: boolean;
  data?: Ministry[];
  error?: string;
};

export type MinistryDetailResult = {
  success: boolean;
  data?: Ministry;
  error?: string;
};

export type MinistryMutationResult = {
  success: boolean;
  data?: Ministry;
  error?: string;
};

export async function getMinistries(): Promise<MinistryListResult> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC, ROLES.SPV]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const rows = await db
      .select({
        id: ministries.id,
        name: ministries.name,
      })
      .from(ministries)
      .orderBy(ministries.name);

    return { success: true, data: rows };
  } catch (err) {
    console.error("[getMinistries] error:", err);
    return { success: false, error: "Failed to load ministries" };
  }
}

export async function getMinistryById(
  id: number,
): Promise<MinistryDetailResult> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC, ROLES.SPV]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const rows = await db
      .select({
        id: ministries.id,
        name: ministries.name,
      })
      .from(ministries)
      .where(eq(ministries.id, id))
      .limit(1);

    if (rows.length === 0) {
      return { success: false, error: "Ministry not found" };
    }

    return { success: true, data: rows[0] };
  } catch (err) {
    console.error("[getMinistryById] error:", err);
    return { success: false, error: "Failed to load ministry" };
  }
}

export async function createMinistry(
  input: Record<string, string>,
): Promise<MinistryMutationResult> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN, ROLES.HEAD_MINISTRY]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const parseResult = ministrySchema.safeParse(input);
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
      .insert(ministries)
      .values({
        name,
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      })
      .returning({ id: ministries.id, name: ministries.name });

    const row = result[0];
    await logAuditTrail("ministries", row.id, "create", {}, row);

    return { success: true, data: row };
  } catch (err) {
    console.error("[createMinistry] error:", err);
    return { success: false, error: "Failed to create ministry" };
  }
}

export async function updateMinistry(
  id: number,
  input: Record<string, string>,
): Promise<MinistryMutationResult> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN, ROLES.HEAD_MINISTRY]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const parseResult = ministrySchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map((err) => err.message).join(", "),
    };
  }

  const { name } = parseResult.data;

  try {
    const ctx = await getUserContext();
    const existing = await getMinistryById(id);
    if (!existing.success || !existing.data) {
      return { success: false, error: "Ministry not found" };
    }

    const result = await db
      .update(ministries)
      .set({
        name,
        updatedAt: new Date(),
        updatedBy: ctx.userId,
      })
      .where(eq(ministries.id, id))
      .returning({ id: ministries.id, name: ministries.name });

    const row = result[0];
    await logAuditTrail("ministries", row.id, "update", existing.data, row);

    return { success: true, data: row };
  } catch (err) {
    console.error("[updateMinistry] error:", err);
    return { success: false, error: "Failed to update ministry" };
  }
}

export async function deleteMinistry(
  id: number,
): Promise<{ success: boolean; error?: string }> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN, ROLES.HEAD_MINISTRY]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const existing = await getMinistryById(id);
    if (!existing.success || !existing.data) {
      return { success: false, error: "Ministry not found" };
    }

    await db.delete(ministries).where(eq(ministries.id, id));
    await logAuditTrail("ministries", id, "delete", existing.data, {});

    return { success: true };
  } catch (err) {
    console.error("[deleteMinistry] error:", err);
    return { success: false, error: "Failed to delete ministry" };
  }
}
