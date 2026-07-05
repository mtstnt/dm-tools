"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/connection";
import { configurations } from "@/db/schema";
import { checkPermission, getUserContext, logAuditTrail } from "./_shared";

const configurationSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  value: z.string().min(1, "Value is required").trim(),
  notes: z.string().trim().optional(),
});

export type Configuration = {
  id: number;
  name: string;
  value: string;
  notes: string | null;
};

export type ConfigurationListResult = {
  success: boolean;
  data?: Configuration[];
  error?: string;
};

export type ConfigurationDetailResult = {
  success: boolean;
  data?: Configuration;
  error?: string;
};

export type ConfigurationMutationResult = {
  success: boolean;
  data?: Configuration;
  error?: string;
};

export async function getConfigurations(): Promise<ConfigurationListResult> {
  const allowed = await checkPermission("configurations", "read");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const rows = await db
      .select({
        id: configurations.id,
        name: configurations.name,
        value: configurations.value,
        notes: configurations.notes,
      })
      .from(configurations)
      .orderBy(configurations.name);

    return { success: true, data: rows };
  } catch (err) {
    console.error("[getConfigurations] error:", err);
    return { success: false, error: "Failed to load configurations" };
  }
}

export async function getConfigurationById(
  id: number,
): Promise<ConfigurationDetailResult> {
  const allowed = await checkPermission("configurations", "read");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const rows = await db
      .select({
        id: configurations.id,
        name: configurations.name,
        value: configurations.value,
        notes: configurations.notes,
      })
      .from(configurations)
      .where(eq(configurations.id, id))
      .limit(1);

    if (rows.length === 0) {
      return { success: false, error: "Configuration not found" };
    }

    return { success: true, data: rows[0] };
  } catch (err) {
    console.error("[getConfigurationById] error:", err);
    return { success: false, error: "Failed to load configuration" };
  }
}

export async function createConfiguration(
  input: Record<string, string>,
): Promise<ConfigurationMutationResult> {
  const allowed = await checkPermission("configurations", "create");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const parseResult = configurationSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map((err) => err.message).join(", "),
    };
  }

  const { name, value, notes } = parseResult.data;

  try {
    const ctx = await getUserContext();
    const now = new Date();

    const result = await db
      .insert(configurations)
      .values({
        name,
        value,
        notes: notes || null,
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      })
      .returning({
        id: configurations.id,
        name: configurations.name,
        value: configurations.value,
        notes: configurations.notes,
      });

    const row = result[0];
    await logAuditTrail("configurations", row.id, "create", {}, row);

    return { success: true, data: row };
  } catch (err) {
    console.error("[createConfiguration] error:", err);
    return { success: false, error: "Failed to create configuration" };
  }
}

export async function updateConfiguration(
  id: number,
  input: Record<string, string>,
): Promise<ConfigurationMutationResult> {
  const allowed = await checkPermission("configurations", "update");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const parseResult = configurationSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map((err) => err.message).join(", "),
    };
  }

  const { name, value, notes } = parseResult.data;

  try {
    const ctx = await getUserContext();
    const existing = await getConfigurationById(id);
    if (!existing.success || !existing.data) {
      return { success: false, error: "Configuration not found" };
    }

    const result = await db
      .update(configurations)
      .set({
        name,
        value,
        notes: notes || null,
        updatedAt: new Date(),
        updatedBy: ctx.userId,
      })
      .where(eq(configurations.id, id))
      .returning({
        id: configurations.id,
        name: configurations.name,
        value: configurations.value,
        notes: configurations.notes,
      });

    const row = result[0];
    await logAuditTrail("configurations", row.id, "update", existing.data, row);

    return { success: true, data: row };
  } catch (err) {
    console.error("[updateConfiguration] error:", err);
    return { success: false, error: "Failed to update configuration" };
  }
}

export async function deleteConfiguration(
  id: number,
): Promise<{ success: boolean; error?: string }> {
  const allowed = await checkPermission("configurations", "delete");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const existing = await getConfigurationById(id);
    if (!existing.success || !existing.data) {
      return { success: false, error: "Configuration not found" };
    }

    await db.delete(configurations).where(eq(configurations.id, id));
    await logAuditTrail("configurations", id, "delete", existing.data, {});

    return { success: true };
  } catch (err) {
    console.error("[deleteConfiguration] error:", err);
    return { success: false, error: "Failed to delete configuration" };
  }
}
