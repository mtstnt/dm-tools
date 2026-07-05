"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/connection";
import { regions } from "@/db/schema";
import { checkPermission, getUserContext, logAuditTrail } from "./_shared";

const regionSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
});

export type Region = {
  id: number;
  name: string;
};

export type RegionListResult = {
  success: boolean;
  data?: Region[];
  error?: string;
};

export type RegionDetailResult = {
  success: boolean;
  data?: Region;
  error?: string;
};

export type RegionMutationResult = {
  success: boolean;
  data?: Region;
  error?: string;
};

export async function getRegions(): Promise<RegionListResult> {
  const allowed = await checkPermission("regions", "read");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const rows = await db
      .select({
        id: regions.id,
        name: regions.name,
      })
      .from(regions)
      .orderBy(regions.name);

    return { success: true, data: rows };
  } catch (err) {
    console.error("[getRegions] error:", err);
    return { success: false, error: "Failed to load regions" };
  }
}

export async function getRegionById(
  id: number,
): Promise<RegionDetailResult> {
  const allowed = await checkPermission("regions", "read");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const rows = await db
      .select({
        id: regions.id,
        name: regions.name,
      })
      .from(regions)
      .where(eq(regions.id, id))
      .limit(1);

    if (rows.length === 0) {
      return { success: false, error: "Region not found" };
    }

    return { success: true, data: rows[0] };
  } catch (err) {
    console.error("[getRegionById] error:", err);
    return { success: false, error: "Failed to load region" };
  }
}

export async function createRegion(
  input: Record<string, string>,
): Promise<RegionMutationResult> {
  const allowed = await checkPermission("regions", "create");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const parseResult = regionSchema.safeParse(input);
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
      .insert(regions)
      .values({
        name,
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      })
      .returning({ id: regions.id, name: regions.name });

    const row = result[0];
    await logAuditTrail("regions", row.id, "create", {}, row);

    return { success: true, data: row };
  } catch (err) {
    console.error("[createRegion] error:", err);
    return { success: false, error: "Failed to create region" };
  }
}

export async function updateRegion(
  id: number,
  input: Record<string, string>,
): Promise<RegionMutationResult> {
  const allowed = await checkPermission("regions", "update");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const parseResult = regionSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map((err) => err.message).join(", "),
    };
  }

  const { name } = parseResult.data;

  try {
    const ctx = await getUserContext();
    const existing = await getRegionById(id);
    if (!existing.success || !existing.data) {
      return { success: false, error: "Region not found" };
    }

    const result = await db
      .update(regions)
      .set({
        name,
        updatedAt: new Date(),
        updatedBy: ctx.userId,
      })
      .where(eq(regions.id, id))
      .returning({ id: regions.id, name: regions.name });

    const row = result[0];
    await logAuditTrail("regions", row.id, "update", existing.data, row);

    return { success: true, data: row };
  } catch (err) {
    console.error("[updateRegion] error:", err);
    return { success: false, error: "Failed to update region" };
  }
}

export async function deleteRegion(
  id: number,
): Promise<{ success: boolean; error?: string }> {
  const allowed = await checkPermission("regions", "delete");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const existing = await getRegionById(id);
    if (!existing.success || !existing.data) {
      return { success: false, error: "Region not found" };
    }

    await db.delete(regions).where(eq(regions.id, id));
    await logAuditTrail("regions", id, "delete", existing.data, {});

    return { success: true };
  } catch (err) {
    console.error("[deleteRegion] error:", err);
    return { success: false, error: "Failed to delete region" };
  }
}
