"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/connection";
import { eventTypes } from "@/db/schema";
import { checkPermission, getUserContext, logAuditTrail } from "./_shared";

const eventTypeSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
});

export type EventType = {
  id: number;
  name: string;
};

export type EventTypeListResult = {
  success: boolean;
  data?: EventType[];
  error?: string;
};

export type EventTypeDetailResult = {
  success: boolean;
  data?: EventType;
  error?: string;
};

export type EventTypeMutationResult = {
  success: boolean;
  data?: EventType;
  error?: string;
};

export async function getEventTypes(): Promise<EventTypeListResult> {
  const allowed = await checkPermission("event_types", "read");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const rows = await db
      .select({
        id: eventTypes.id,
        name: eventTypes.name,
      })
      .from(eventTypes)
      .orderBy(eventTypes.name);

    return { success: true, data: rows };
  } catch (err) {
    console.error("[getEventTypes] error:", err);
    return { success: false, error: "Failed to load event types" };
  }
}

export async function getEventTypeById(
  id: number,
): Promise<EventTypeDetailResult> {
  const allowed = await checkPermission("event_types", "read");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const rows = await db
      .select({
        id: eventTypes.id,
        name: eventTypes.name,
      })
      .from(eventTypes)
      .where(eq(eventTypes.id, id))
      .limit(1);

    if (rows.length === 0) {
      return { success: false, error: "Event type not found" };
    }

    return { success: true, data: rows[0] };
  } catch (err) {
    console.error("[getEventTypeById] error:", err);
    return { success: false, error: "Failed to load event type" };
  }
}

export async function createEventType(
  input: Record<string, string>,
): Promise<EventTypeMutationResult> {
  const allowed = await checkPermission("event_types", "create");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const parseResult = eventTypeSchema.safeParse(input);
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
      .insert(eventTypes)
      .values({
        name,
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      })
      .returning({ id: eventTypes.id, name: eventTypes.name });

    const row = result[0];
    await logAuditTrail("event_types", row.id, "create", {}, row);

    return { success: true, data: row };
  } catch (err) {
    console.error("[createEventType] error:", err);
    return { success: false, error: "Failed to create event type" };
  }
}

export async function updateEventType(
  id: number,
  input: Record<string, string>,
): Promise<EventTypeMutationResult> {
  const allowed = await checkPermission("event_types", "update");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const parseResult = eventTypeSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map((err) => err.message).join(", "),
    };
  }

  const { name } = parseResult.data;

  try {
    const ctx = await getUserContext();
    const existing = await getEventTypeById(id);
    if (!existing.success || !existing.data) {
      return { success: false, error: "Event type not found" };
    }

    const result = await db
      .update(eventTypes)
      .set({
        name,
        updatedAt: new Date(),
        updatedBy: ctx.userId,
      })
      .where(eq(eventTypes.id, id))
      .returning({ id: eventTypes.id, name: eventTypes.name });

    const row = result[0];
    await logAuditTrail("event_types", row.id, "update", existing.data, row);

    return { success: true, data: row };
  } catch (err) {
    console.error("[updateEventType] error:", err);
    return { success: false, error: "Failed to update event type" };
  }
}

export async function deleteEventType(
  id: number,
): Promise<{ success: boolean; error?: string }> {
  const allowed = await checkPermission("event_types", "delete");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const existing = await getEventTypeById(id);
    if (!existing.success || !existing.data) {
      return { success: false, error: "Event type not found" };
    }

    await db.delete(eventTypes).where(eq(eventTypes.id, id));
    await logAuditTrail("event_types", id, "delete", existing.data, {});

    return { success: true };
  } catch (err) {
    console.error("[deleteEventType] error:", err);
    return { success: false, error: "Failed to delete event type" };
  }
}
