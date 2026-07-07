"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/connection";
import { tasks } from "@/db/schema";
import { checkPermission, getUserContext, logAuditTrail } from "./_shared";

const taskSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
});

export type Task = {
  id: number;
  name: string;
};

export type TaskListResult = {
  success: boolean;
  data?: Task[];
  error?: string;
};

export type TaskDetailResult = {
  success: boolean;
  data?: Task;
  error?: string;
};

export type TaskMutationResult = {
  success: boolean;
  data?: Task;
  error?: string;
};

export async function getTasks(): Promise<TaskListResult> {
  const allowed = await checkPermission("tasks", "read");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const rows = await db
      .select({
        id: tasks.id,
        name: tasks.name,
      })
      .from(tasks)
      .orderBy(tasks.name);

    return { success: true, data: rows };
  } catch (err) {
    console.error("[getTasks] error:", err);
    return { success: false, error: "Failed to load tasks" };
  }
}

export async function getTaskById(
  id: number,
): Promise<TaskDetailResult> {
  const allowed = await checkPermission("tasks", "read");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const rows = await db
      .select({
        id: tasks.id,
        name: tasks.name,
      })
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    if (rows.length === 0) {
      return { success: false, error: "Task not found" };
    }

    return { success: true, data: rows[0] };
  } catch (err) {
    console.error("[getTaskById] error:", err);
    return { success: false, error: "Failed to load task" };
  }
}

export async function createTask(
  input: Record<string, string>,
): Promise<TaskMutationResult> {
  const allowed = await checkPermission("tasks", "create");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const parseResult = taskSchema.safeParse(input);
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
      .insert(tasks)
      .values({
        name,
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      })
      .returning({ id: tasks.id, name: tasks.name });

    const row = result[0];
    await logAuditTrail("tasks", row.id, "create", {}, row);

    return { success: true, data: row };
  } catch (err) {
    console.error("[createTask] error:", err);
    return { success: false, error: "Failed to create task" };
  }
}

export async function updateTask(
  id: number,
  input: Record<string, string>,
): Promise<TaskMutationResult> {
  const allowed = await checkPermission("tasks", "update");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const parseResult = taskSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map((err) => err.message).join(", "),
    };
  }

  const { name } = parseResult.data;

  try {
    const ctx = await getUserContext();
    const existing = await getTaskById(id);
    if (!existing.success || !existing.data) {
      return { success: false, error: "Task not found" };
    }

    const result = await db
      .update(tasks)
      .set({
        name,
        updatedAt: new Date(),
        updatedBy: ctx.userId,
      })
      .where(eq(tasks.id, id))
      .returning({ id: tasks.id, name: tasks.name });

    const row = result[0];
    await logAuditTrail("tasks", row.id, "update", existing.data, row);

    return { success: true, data: row };
  } catch (err) {
    console.error("[updateTask] error:", err);
    return { success: false, error: "Failed to update task" };
  }
}

export async function deleteTask(
  id: number,
): Promise<{ success: boolean; error?: string }> {
  const allowed = await checkPermission("tasks", "delete");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const existing = await getTaskById(id);
    if (!existing.success || !existing.data) {
      return { success: false, error: "Task not found" };
    }

    await db.delete(tasks).where(eq(tasks.id, id));
    await logAuditTrail("tasks", id, "delete", existing.data, {});

    return { success: true };
  } catch (err) {
    console.error("[deleteTask] error:", err);
    return { success: false, error: "Failed to delete task" };
  }
}
