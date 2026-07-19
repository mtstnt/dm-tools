"use server";

import { and, asc, countDistinct, desc, eq, gte, lt, notInArray } from "drizzle-orm";
import { db } from "@/db/connection";
import {
  eventAssignments,
  eventTypes,
  events,
  roles,
  tasks,
  teams,
  users,
} from "@/db/schema";
import { getUserRole } from "@/actions/master/_shared";
import { canAccess, ROLES } from "@/lib/permissions";

export type EventRecapSummaryItem = {
  userId: number;
  fullName: string;
  nij: string;
  teamNumber: number | null;
  roleName: string | null;
  participationCount: number;
};

export type EventRecapSummaryResult = {
  success: boolean;
  data?: EventRecapSummaryItem[];
  error?: string;
};

const EXCLUDED_EVENT_TYPES = ["AOG TEEN", "AOG YOUTH"];

export async function getEventRecapSummary(
  year?: number,
): Promise<EventRecapSummaryResult> {
  const role = await getUserRole();
  const allowed = canAccess(role, [
    ROLES.ADMIN,
    ROLES.HEAD_MINISTRY,
    ROLES.REGIONAL_PIC,
    ROLES.SPV,
    ROLES.MEMBER,
  ]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const targetYear = year ?? new Date().getFullYear();

  if (!Number.isInteger(targetYear) || targetYear < 2020 || targetYear > 2100) {
    return { success: false, error: "Invalid year" };
  }

  const startDate = new Date(targetYear, 0, 1);
  const endDate = new Date(targetYear + 1, 0, 1);

  try {
    const rows = await db
      .select({
        userId: users.id,
        fullName: users.fullName,
        nij: users.nij,
        teamNumber: teams.number,
        roleName: roles.name,
        participationCount: countDistinct(eventAssignments.eventId),
      })
      .from(eventAssignments)
      .innerJoin(users, eq(eventAssignments.userId, users.id))
      .innerJoin(events, eq(eventAssignments.eventId, events.id))
      .innerJoin(eventTypes, eq(events.eventTypeId, eventTypes.id))
      .leftJoin(teams, eq(users.teamId, teams.id))
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(
        and(
          notInArray(eventTypes.name, EXCLUDED_EVENT_TYPES),
          gte(events.date, startDate),
          lt(events.date, endDate),
        ),
      )
      .groupBy(users.id)
      .orderBy(desc(countDistinct(eventAssignments.eventId)), asc(users.fullName));

    const data: EventRecapSummaryItem[] = rows.map((row) => ({
      userId: row.userId,
      fullName: row.fullName,
      nij: row.nij,
      teamNumber: row.teamNumber,
      roleName: row.roleName,
      participationCount: row.participationCount,
    }));

    return { success: true, data };
  } catch (err) {
    console.error("[getEventRecapSummary] error:", err);
    return { success: false, error: "Failed to load event recap" };
  }
}

export type UserRecapEvent = {
  eventId: number;
  eventName: string;
  eventDate: Date;
  isPic: boolean;
};

export type UserRecapEventsResult = {
  success: boolean;
  data?: UserRecapEvent[];
  error?: string;
};

export async function getUserRecapEvents(
  userId: number,
  year?: number,
): Promise<UserRecapEventsResult> {
  const role = await getUserRole();
  const allowed = canAccess(role, [
    ROLES.ADMIN,
    ROLES.HEAD_MINISTRY,
    ROLES.REGIONAL_PIC,
    ROLES.SPV,
    ROLES.MEMBER,
  ]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  if (!Number.isInteger(userId) || userId <= 0) {
    return { success: false, error: "Invalid user" };
  }

  const targetYear = year ?? new Date().getFullYear();
  const startDate = new Date(targetYear, 0, 1);
  const endDate = new Date(targetYear + 1, 0, 1);

  try {
    const [picTaskRows, assignmentRows] = await Promise.all([
      db
        .select({ id: tasks.id })
        .from(tasks)
        .where(eq(tasks.name, "Event PIC"))
        .limit(1),
      db
        .select({
          eventId: events.id,
          eventName: events.name,
          eventDate: events.date,
          taskId: eventAssignments.taskId,
        })
        .from(eventAssignments)
        .innerJoin(events, eq(eventAssignments.eventId, events.id))
        .innerJoin(eventTypes, eq(events.eventTypeId, eventTypes.id))
        .where(
          and(
            eq(eventAssignments.userId, userId),
            notInArray(eventTypes.name, EXCLUDED_EVENT_TYPES),
            gte(events.date, startDate),
            lt(events.date, endDate),
          ),
        )
        .orderBy(asc(events.date)),
    ]);

    const picTaskId = picTaskRows[0]?.id;
    const eventMap = new Map<number, UserRecapEvent>();

    for (const row of assignmentRows) {
      const eventDate = new Date(row.eventDate);
      const isPic = row.taskId === picTaskId;

      const existing = eventMap.get(row.eventId);

      if (existing) {
        if (isPic) existing.isPic = true;
        continue;
      }

      eventMap.set(row.eventId, {
        eventId: row.eventId,
        eventName: row.eventName,
        eventDate,
        isPic,
      });
    }

    const data = Array.from(eventMap.values());
    return { success: true, data };
  } catch (err) {
    console.error("[getUserRecapEvents] error:", err);
    return { success: false, error: "Failed to load user events" };
  }
}
