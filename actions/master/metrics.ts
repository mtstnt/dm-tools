"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/connection";
import { metrics } from "@/db/schema";
import { getUserRole, getUserContext, logAuditTrail } from "./_shared";
import { ROLES, canAccess } from "@/lib/permissions";

const metricSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  notes: z.string().trim().optional(),
});

export type Metric = {
  id: number;
  name: string;
  notes: string | null;
};

export type MetricListResult = {
  success: boolean;
  data?: Metric[];
  error?: string;
};

export type MetricDetailResult = {
  success: boolean;
  data?: Metric;
  error?: string;
};

export type MetricMutationResult = {
  success: boolean;
  data?: Metric;
  error?: string;
};

export async function getMetrics(): Promise<MetricListResult> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC, ROLES.SPV]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const rows = await db
      .select({
        id: metrics.id,
        name: metrics.name,
        notes: metrics.notes,
      })
      .from(metrics)
      .orderBy(metrics.name);

    return { success: true, data: rows };
  } catch (err) {
    console.error("[getMetrics] error:", err);
    return { success: false, error: "Failed to load metrics" };
  }
}

export async function getMetricById(
  id: number,
): Promise<MetricDetailResult> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC, ROLES.SPV]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const rows = await db
      .select({
        id: metrics.id,
        name: metrics.name,
        notes: metrics.notes,
      })
      .from(metrics)
      .where(eq(metrics.id, id))
      .limit(1);

    if (rows.length === 0) {
      return { success: false, error: "Metric not found" };
    }

    return { success: true, data: rows[0] };
  } catch (err) {
    console.error("[getMetricById] error:", err);
    return { success: false, error: "Failed to load metric" };
  }
}

export async function createMetric(
  input: Record<string, string>,
): Promise<MetricMutationResult> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN, ROLES.HEAD_MINISTRY]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const parseResult = metricSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map((err) => err.message).join(", "),
    };
  }

  const { name, notes } = parseResult.data;

  try {
    const ctx = await getUserContext();
    const now = new Date();

    const result = await db
      .insert(metrics)
      .values({
        name,
        notes: notes || null,
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      })
      .returning({
        id: metrics.id,
        name: metrics.name,
        notes: metrics.notes,
      });

    const row = result[0];
    await logAuditTrail("metrics", row.id, "create", {}, row);

    return { success: true, data: row };
  } catch (err) {
    console.error("[createMetric] error:", err);
    return { success: false, error: "Failed to create metric" };
  }
}

export async function updateMetric(
  id: number,
  input: Record<string, string>,
): Promise<MetricMutationResult> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN, ROLES.HEAD_MINISTRY]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const parseResult = metricSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map((err) => err.message).join(", "),
    };
  }

  const { name, notes } = parseResult.data;

  try {
    const ctx = await getUserContext();
    const existing = await getMetricById(id);
    if (!existing.success || !existing.data) {
      return { success: false, error: "Metric not found" };
    }

    const result = await db
      .update(metrics)
      .set({
        name,
        notes: notes || null,
        updatedAt: new Date(),
        updatedBy: ctx.userId,
      })
      .where(eq(metrics.id, id))
      .returning({
        id: metrics.id,
        name: metrics.name,
        notes: metrics.notes,
      });

    const row = result[0];
    await logAuditTrail("metrics", row.id, "update", existing.data, row);

    return { success: true, data: row };
  } catch (err) {
    console.error("[updateMetric] error:", err);
    return { success: false, error: "Failed to update metric" };
  }
}

export async function deleteMetric(
  id: number,
): Promise<{ success: boolean; error?: string }> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN, ROLES.HEAD_MINISTRY]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const existing = await getMetricById(id);
    if (!existing.success || !existing.data) {
      return { success: false, error: "Metric not found" };
    }

    await db.delete(metrics).where(eq(metrics.id, id));
    await logAuditTrail("metrics", id, "delete", existing.data, {});

    return { success: true };
  } catch (err) {
    console.error("[deleteMetric] error:", err);
    return { success: false, error: "Failed to delete metric" };
  }
}
