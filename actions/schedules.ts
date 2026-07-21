"use server";

import { and, asc, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import { db } from "@/db/connection";
import {
  eventAssignmentChangeRequests,
  eventAssignments,
  eventTeams,
  eventTypes,
  events,
  regions,
  roles,
  tasks,
  teams,
  users,
  type ApprovalStatus,
  type EventMode,
  type EventStatus,
} from "@/db/schema";
import { getUserContext, getUserRole } from "@/actions/master/_shared";
import { getCurrentUser } from "@/actions/auth/current-user";
import { ROLES, canAccess } from "@/lib/permissions";

export type ScheduleMember = {
  assignmentId: number;
  userId: number;
  fullName: string;
  nij: string;
  teamId: number | null;
  teamNumber: number | null;
  isSpv: boolean;
  isPic: boolean;
  taskName: string | null;
  taskId: number | null;
  blockName: string | null;
  pendingRequestType: "switch" | "cancellation" | "helper" | null;
};

export type ScheduleEvent = {
  id: number;
  name: string;
  date: Date;
  status: EventStatus;
  regionName: string;
  eventTypeName: string;
  mode?: EventMode;
  teams: {
    id: number;
    number: number;
  }[];
  members: ScheduleMember[];
};

export type SchedulesResult = {
  success: boolean;
  data?: ScheduleEvent[];
  error?: string;
};

export type ChangeRequestItem = {
  id: number;
  eventId: number;
  eventName: string;
  eventDate: Date;
  type: "switch" | "cancellation" | "helper";
  userFromId: number | null;
  userFromName: string | null;
  userToId: number | null;
  userToName: string | null;
  status: ApprovalStatus;
  createdAt: Date;
  fromTeamId: number | null;
  fromTeamNumber: number | null;
  toTeamId: number | null;
  toTeamNumber: number | null;
};

export type ChangeRequestsResult = {
  success: boolean;
  data?: ChangeRequestItem[];
  error?: string;
};

export type ReplacementUser = {
  id: number;
  fullName: string;
  nij: string;
};

export type ReplacementsResult = {
  success: boolean;
  data?: ReplacementUser[];
  error?: string;
};

export type MutationResult = {
  success: boolean;
  error?: string;
};

function deriveType(
  userFromId: number | null,
  userToId: number | null,
): "switch" | "cancellation" | "helper" {
  if (userFromId !== null && userToId !== null) return "switch";
  if (userFromId !== null && userToId === null) return "cancellation";
  return "helper";
}

export async function getSchedules(
  month: number,
  year: number,
): Promise<SchedulesResult> {
  const allowed = canAccess(await getUserRole(), [
    ROLES.ADMIN,
    ROLES.HEAD_MINISTRY,
    ROLES.REGIONAL_PIC,
    ROLES.SPV,
    ROLES.MEMBER,
  ]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  if (!Number.isInteger(month) || month < 0 || month > 11) {
    return { success: false, error: "Invalid month" };
  }

  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return { success: false, error: "Invalid year" };
  }

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 1);

  try {
    const eventRows = await db
      .select({
        id: events.id,
        name: events.name,
        date: events.date,
        status: events.status,
        regionName: regions.name,
        eventTypeName: eventTypes.name,
        mode: events.mode,
      })
      .from(events)
      .innerJoin(regions, eq(events.regionId, regions.id))
      .innerJoin(eventTypes, eq(events.eventTypeId, eventTypes.id))
      .where(and(gte(events.date, startDate), lt(events.date, endDate)))
      .orderBy(asc(events.date), asc(events.name));

    if (eventRows.length === 0) {
      return { success: true, data: [] };
    }

    const eventIds = eventRows.map((e) => e.id);

    const picTaskRows = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.name, "Event PIC"))
      .limit(1);
    const picTaskId = picTaskRows[0]?.id ?? null;

    const [assignmentRows, teamRows, pendingChangeRows] = await Promise.all([
      db
        .select({
          eventId: eventAssignments.eventId,
          userId: users.id,
          fullName: users.fullName,
          nij: users.nij,
          teamId: users.teamId,
          teamNumber: teams.number,
          roleName: roles.name,
          taskId: eventAssignments.taskId,
          taskName: tasks.name,
          blockName: eventAssignments.blockName,
        })
        .from(eventAssignments)
        .innerJoin(users, eq(eventAssignments.userId, users.id))
        .leftJoin(teams, eq(users.teamId, teams.id))
        .innerJoin(roles, eq(users.roleId, roles.id))
        .leftJoin(tasks, eq(eventAssignments.taskId, tasks.id))
        .where(inArray(eventAssignments.eventId, eventIds))
        .orderBy(asc(teams.number), asc(users.fullName)),
      db
        .select({
          eventId: eventTeams.eventId,
          teamId: teams.id,
          teamNumber: teams.number,
        })
        .from(eventTeams)
        .innerJoin(teams, eq(eventTeams.teamId, teams.id))
        .where(inArray(eventTeams.eventId, eventIds))
        .orderBy(asc(teams.number)),
      db
        .select({
          eventId: eventAssignmentChangeRequests.eventId,
          userFromId: eventAssignmentChangeRequests.userFromId,
          userToId: eventAssignmentChangeRequests.userToId,
        })
        .from(eventAssignmentChangeRequests)
        .where(
          and(
            inArray(eventAssignmentChangeRequests.eventId, eventIds),
            eq(eventAssignmentChangeRequests.status, "pending"),
          ),
        ),
    ]);

    const pendingMap = new Map<string, "switch" | "cancellation" | "helper">();
    for (const r of pendingChangeRows) {
      const type = deriveType(r.userFromId, r.userToId);
      if (r.userFromId !== null) {
        pendingMap.set(`${r.eventId}-from-${r.userFromId}`, type);
      }
      if (r.userToId !== null) {
        pendingMap.set(`${r.eventId}-to-${r.userToId}`, type);
      }
    }

    const assignmentsByEvent = new Map<number, ScheduleMember[]>();
    for (const row of assignmentRows) {
      const list = assignmentsByEvent.get(row.eventId) ?? [];
      const alreadyExists = list.some((m) => m.userId === row.userId);
      if (alreadyExists) {
        const existing = list.find((m) => m.userId === row.userId)!;
        if (!existing.isPic && row.taskId === picTaskId) {
          existing.isPic = true;
        }
        continue;
      }
      const pendingType =
        pendingMap.get(`${row.eventId}-from-${row.userId}`) ?? null;
      list.push({
        assignmentId: 0,
        userId: row.userId,
        fullName: row.fullName,
        nij: row.nij,
        teamId: row.teamId,
        teamNumber: row.teamNumber,
        isSpv: row.roleName === ROLES.SPV,
        isPic: row.taskId === picTaskId,
        taskName: row.taskName,
        taskId: row.taskId,
        blockName: row.blockName,
        pendingRequestType: pendingType,
      });
      assignmentsByEvent.set(row.eventId, list);
    }

    const teamsByEvent = new Map<
      number,
      { id: number; number: number }[]
    >();
    for (const row of teamRows) {
      const list = teamsByEvent.get(row.eventId) ?? [];
      list.push({ id: row.teamId, number: row.teamNumber });
      teamsByEvent.set(row.eventId, list);
    }

    const data: ScheduleEvent[] = eventRows.map((event) => ({
      id: event.id,
      name: event.name,
      date: event.date,
      status: event.status,
      regionName: event.regionName,
      eventTypeName: event.eventTypeName,
      mode: event.mode,
      teams: teamsByEvent.get(event.id) ?? [],
      members: assignmentsByEvent.get(event.id) ?? [],
    }));

    return { success: true, data };
  } catch (err) {
    console.error("[getSchedules] error:", err);
    return { success: false, error: "Failed to load schedules" };
  }
}

export async function getAvailableReplacements(
  eventId: number,
  userFromId: number,
): Promise<ReplacementsResult> {
  const allowed = canAccess(await getUserRole(), [
    ROLES.ADMIN,
    ROLES.REGIONAL_PIC,
    ROLES.SPV,
  ]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const [assignedUserIds, fromUserRole] = await Promise.all([
      db
        .select({ userId: eventAssignments.userId })
        .from(eventAssignments)
        .where(
          and(
            eq(eventAssignments.eventId, eventId),
            isNull(eventAssignments.blockName),
            isNull(eventAssignments.rating),
          ),
        ),
      db
        .select({ roleName: roles.name })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .where(eq(users.id, userFromId))
        .limit(1),
    ]);

    const assignedIdSet = new Set(assignedUserIds.map((r) => r.userId));
    const fromIsSpv = fromUserRole[0]?.roleName === ROLES.SPV;

    const rows = fromIsSpv
      ? await db
          .select({
            id: users.id,
            fullName: users.fullName,
            nij: users.nij,
          })
          .from(users)
          .innerJoin(roles, eq(users.roleId, roles.id))
          .where(eq(roles.name, ROLES.SPV))
          .orderBy(asc(users.fullName))
      : await db
          .select({
            id: users.id,
            fullName: users.fullName,
            nij: users.nij,
          })
          .from(users)
          .orderBy(asc(users.fullName));

    const data: ReplacementUser[] = rows
      .filter((u) => !assignedIdSet.has(u.id) && u.id !== userFromId)
      .map((u) => ({
        id: u.id,
        fullName: u.fullName,
        nij: u.nij,
      }));

    return { success: true, data };
  } catch (err) {
    console.error("[getAvailableReplacements] error:", err);
    return { success: false, error: "Failed to load replacements" };
  }
}

export async function getAvailableHelpers(
  eventId: number,
): Promise<ReplacementsResult> {
  const allowed = canAccess(await getUserRole(), [
    ROLES.ADMIN,
    ROLES.REGIONAL_PIC,
    ROLES.SPV,
  ]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const assignedUserIds = await db
      .select({ userId: eventAssignments.userId })
      .from(eventAssignments)
      .where(eq(eventAssignments.eventId, eventId));

    const assignedIdSet = new Set(assignedUserIds.map((r) => r.userId));

    const rows = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        nij: users.nij,
      })
      .from(users)
      .orderBy(asc(users.fullName));

    const data: ReplacementUser[] = rows
      .filter((u) => !assignedIdSet.has(u.id))
      .map((u) => ({
        id: u.id,
        fullName: u.fullName,
        nij: u.nij,
      }));

    return { success: true, data };
  } catch (err) {
    console.error("[getAvailableHelpers] error:", err);
    return { success: false, error: "Failed to load helpers" };
  }
}

export async function requestChange(
  eventId: number,
  userFromId: number | null,
  userToId: number | null,
): Promise<MutationResult> {
  if (userFromId === null && userToId === null) {
    return {
      success: false,
      error: "At least one of userFromId or userToId must be provided",
    };
  }

  const role = await getUserRole();
  if (!canAccess(role, [ROLES.ADMIN, ROLES.REGIONAL_PIC, ROLES.SPV])) {
    return { success: false, error: "Forbidden" };
  }

  try {
    if (role === ROLES.SPV) {
      const spvTeamId = await getCurrentUserTeamId();
      if (spvTeamId === null) {
        return { success: false, error: "Forbidden" };
      }

      if (userFromId !== null) {
        const fromUser = await db
          .select({ teamId: users.teamId })
          .from(users)
          .where(eq(users.id, userFromId))
          .limit(1);
        if (fromUser[0]?.teamId !== spvTeamId) {
          return { success: false, error: "Forbidden" };
        }
      } else {
        const toUser = await db
          .select({ teamId: users.teamId })
          .from(users)
          .where(eq(users.id, userToId!))
          .limit(1);
        if (toUser[0]?.teamId !== spvTeamId) {
          return { success: false, error: "Forbidden" };
        }
      }
    }

    if (userFromId !== null) {
      const fromAssignment = await db
        .select({ id: eventAssignments.id })
        .from(eventAssignments)
        .where(
          and(
            eq(eventAssignments.eventId, eventId),
            eq(eventAssignments.userId, userFromId),
          ),
        )
        .limit(1);
      if (!fromAssignment[0]) {
        return {
          success: false,
          error: "The member is not assigned to this event",
        };
      }

      if (userToId !== null) {
        const fromUserRole = await db
          .select({ roleName: roles.name })
          .from(users)
          .innerJoin(roles, eq(users.roleId, roles.id))
          .where(eq(users.id, userFromId))
          .limit(1);
        if (fromUserRole[0]?.roleName === ROLES.SPV) {
          const toUserRole = await db
            .select({ roleName: roles.name })
            .from(users)
            .innerJoin(roles, eq(users.roleId, roles.id))
            .where(eq(users.id, userToId))
            .limit(1);
          if (toUserRole[0]?.roleName !== ROLES.SPV) {
            return {
              success: false,
              error: "The replacement member must also be an SPV",
            };
          }
        }
      }
    }

    if (userToId !== null) {
      const toAssignment = await db
        .select({ id: eventAssignments.id })
        .from(eventAssignments)
        .where(
          and(
            eq(eventAssignments.eventId, eventId),
            eq(eventAssignments.userId, userToId),
          ),
        )
        .limit(1);
      if (toAssignment[0]) {
        return {
          success: false,
          error: "This member is already assigned to the event",
        };
      }
    }

    const existingConditions = [
      eq(eventAssignmentChangeRequests.eventId, eventId),
      eq(eventAssignmentChangeRequests.status, "pending"),
      userFromId !== null
        ? eq(eventAssignmentChangeRequests.userFromId, userFromId)
        : isNull(eventAssignmentChangeRequests.userFromId),
      userToId !== null
        ? eq(eventAssignmentChangeRequests.userToId, userToId)
        : isNull(eventAssignmentChangeRequests.userToId),
    ];

    const existingRequest = await db
      .select({ id: eventAssignmentChangeRequests.id })
      .from(eventAssignmentChangeRequests)
      .where(and(...existingConditions))
      .limit(1);

    const ctx = await getUserContext();

    if (existingRequest[0]) {
      await db
        .update(eventAssignmentChangeRequests)
        .set({
          updatedAt: new Date(),
          updatedBy: ctx.userName,
        })
        .where(eq(eventAssignmentChangeRequests.id, existingRequest[0].id));
      return { success: true };
    }

    await db.insert(eventAssignmentChangeRequests).values({
      eventId,
      userFromId,
      userToId,
      status: "pending",
      approvedAt: new Date(),
      createdBy: ctx.userName,
      updatedBy: ctx.userName,
    });

    return { success: true };
  } catch (err) {
    console.error("[requestChange] error:", err);
    return { success: false, error: "Failed to create change request" };
  }
}

async function getCurrentUserTeamId(): Promise<number | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const rows = await db
    .select({ teamId: users.teamId })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  return rows[0]?.teamId ?? null;
}

async function canApproveChange(requestRow: {
  eventId: number;
  userFromId: number | null;
  userToId: number | null;
}): Promise<boolean> {
  const role = await getUserRole();
  if (!role) return false;
  if (role === ROLES.ADMIN || role === ROLES.REGIONAL_PIC) return true;

  if (role !== ROLES.SPV) return false;

  const spvTeamId = await getCurrentUserTeamId();
  if (spvTeamId === null) return false;

  const type = deriveType(requestRow.userFromId, requestRow.userToId);

  if (type === "helper") return false;

  if (type === "cancellation") {
    const fromUser = await db
      .select({ teamId: users.teamId })
      .from(users)
      .where(eq(users.id, requestRow.userFromId!))
      .limit(1);
    return fromUser[0]?.teamId === spvTeamId;
  }

  const toUser = await db
    .select({ teamId: users.teamId })
    .from(users)
    .where(eq(users.id, requestRow.userToId!))
    .limit(1);
  return toUser[0]?.teamId === spvTeamId;
}

export async function getPendingChanges(): Promise<ChangeRequestsResult> {
  const role = await getUserRole();
  if (!canAccess(role, [ROLES.ADMIN, ROLES.REGIONAL_PIC, ROLES.SPV])) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const requestRows = await db
      .select({
        id: eventAssignmentChangeRequests.id,
        eventId: eventAssignmentChangeRequests.eventId,
        eventName: events.name,
        eventDate: events.date,
        userFromId: eventAssignmentChangeRequests.userFromId,
        userToId: eventAssignmentChangeRequests.userToId,
        status: eventAssignmentChangeRequests.status,
        createdAt: eventAssignmentChangeRequests.createdAt,
      })
      .from(eventAssignmentChangeRequests)
      .innerJoin(events, eq(eventAssignmentChangeRequests.eventId, events.id))
      .where(eq(eventAssignmentChangeRequests.status, "pending"))
      .orderBy(asc(eventAssignmentChangeRequests.createdAt));

    if (requestRows.length === 0) {
      return { success: true, data: [] };
    }

    const userIds = new Set<number>();
    for (const r of requestRows) {
      if (r.userFromId) userIds.add(r.userFromId);
      if (r.userToId) userIds.add(r.userToId);
    }

    const [userRows, teamRows] = await Promise.all([
      db
        .select({
          id: users.id,
          fullName: users.fullName,
          teamId: users.teamId,
        })
        .from(users)
        .where(inArray(users.id, [...userIds])),
      db
        .select({
          teamId: teams.id,
          teamNumber: teams.number,
        })
        .from(teams),
    ]);

    const userMap = new Map(userRows.map((u) => [u.id, u]));
    const teamMap = new Map(teamRows.map((t) => [t.teamId, t.teamNumber]));

    let data: ChangeRequestItem[] = requestRows.map((row) => {
      const fromUser = row.userFromId ? userMap.get(row.userFromId) : null;
      const toUser = row.userToId ? userMap.get(row.userToId) : null;
      const fromTeamId = fromUser?.teamId ?? null;
      const toTeamId = toUser?.teamId ?? null;
      const type = deriveType(row.userFromId, row.userToId);

      return {
        id: row.id,
        eventId: row.eventId,
        eventName: row.eventName,
        eventDate: row.eventDate,
        type,
        userFromId: row.userFromId,
        userFromName: fromUser?.fullName ?? null,
        userToId: row.userToId,
        userToName: toUser?.fullName ?? null,
        status: row.status,
        createdAt: row.createdAt,
        fromTeamId,
        fromTeamNumber: fromTeamId
          ? (teamMap.get(fromTeamId) ?? null)
          : null,
        toTeamId,
        toTeamNumber: toTeamId ? (teamMap.get(toTeamId) ?? null) : null,
      };
    });

    if (role === ROLES.SPV) {
      const spvTeamId = await getCurrentUserTeamId();
      if (spvTeamId === null) {
        return { success: true, data: [] };
      }
      data = data.filter(
        (r) => r.fromTeamId === spvTeamId || r.toTeamId === spvTeamId,
      );
    }

    return { success: true, data };
  } catch (err) {
    console.error("[getPendingChanges] error:", err);
    return { success: false, error: "Failed to load change requests" };
  }
}

export async function getChangeRequests(
  month: number,
  year: number,
): Promise<ChangeRequestsResult> {
  const role = await getUserRole();
  if (!canAccess(role, [ROLES.ADMIN, ROLES.REGIONAL_PIC, ROLES.SPV])) {
    return { success: false, error: "Forbidden" };
  }

  if (!Number.isInteger(month) || month < 0 || month > 11) {
    return { success: false, error: "Invalid month" };
  }

  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return { success: false, error: "Invalid year" };
  }

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 1);

  try {
    const requestRows = await db
      .select({
        id: eventAssignmentChangeRequests.id,
        eventId: eventAssignmentChangeRequests.eventId,
        eventName: events.name,
        eventDate: events.date,
        userFromId: eventAssignmentChangeRequests.userFromId,
        userToId: eventAssignmentChangeRequests.userToId,
        status: eventAssignmentChangeRequests.status,
        createdAt: eventAssignmentChangeRequests.createdAt,
      })
      .from(eventAssignmentChangeRequests)
      .innerJoin(events, eq(eventAssignmentChangeRequests.eventId, events.id))
      .where(and(gte(events.date, startDate), lt(events.date, endDate)))
      .orderBy(asc(eventAssignmentChangeRequests.createdAt));

    if (requestRows.length === 0) {
      return { success: true, data: [] };
    }

    const userIds = new Set<number>();
    for (const r of requestRows) {
      if (r.userFromId) userIds.add(r.userFromId);
      if (r.userToId) userIds.add(r.userToId);
    }

    const [userRows, teamRows] = await Promise.all([
      db
        .select({ id: users.id, fullName: users.fullName, teamId: users.teamId })
        .from(users)
        .where(inArray(users.id, [...userIds])),
      db
        .select({ teamId: teams.id, teamNumber: teams.number })
        .from(teams),
    ]);

    const userMap = new Map(userRows.map((u) => [u.id, u]));
    const teamMap = new Map(teamRows.map((t) => [t.teamId, t.teamNumber]));

    let data: ChangeRequestItem[] = requestRows.map((row) => {
      const fromUser = row.userFromId ? userMap.get(row.userFromId) : null;
      const toUser = row.userToId ? userMap.get(row.userToId) : null;
      const fromTeamId = fromUser?.teamId ?? null;
      const toTeamId = toUser?.teamId ?? null;
      const type = deriveType(row.userFromId, row.userToId);

      return {
        id: row.id,
        eventId: row.eventId,
        eventName: row.eventName,
        eventDate: row.eventDate,
        type,
        userFromId: row.userFromId,
        userFromName: fromUser?.fullName ?? null,
        userToId: row.userToId,
        userToName: toUser?.fullName ?? null,
        status: row.status,
        createdAt: row.createdAt,
        fromTeamId,
        fromTeamNumber: fromTeamId
          ? (teamMap.get(fromTeamId) ?? null)
          : null,
        toTeamId,
        toTeamNumber: toTeamId ? (teamMap.get(toTeamId) ?? null) : null,
      };
    });

    if (role === ROLES.SPV) {
      const spvTeamId = await getCurrentUserTeamId();
      if (spvTeamId === null) {
        return { success: true, data: [] };
      }
      data = data.filter(
        (r) => r.fromTeamId === spvTeamId || r.toTeamId === spvTeamId,
      );
    }

    return { success: true, data };
  } catch (err) {
    console.error("[getChangeRequests] error:", err);
    return { success: false, error: "Failed to load change requests" };
  }
}

export async function approveChange(
  requestId: number,
): Promise<MutationResult> {
  try {
    const requestRows = await db
      .select({
        id: eventAssignmentChangeRequests.id,
        eventId: eventAssignmentChangeRequests.eventId,
        userFromId: eventAssignmentChangeRequests.userFromId,
        userToId: eventAssignmentChangeRequests.userToId,
        status: eventAssignmentChangeRequests.status,
      })
      .from(eventAssignmentChangeRequests)
      .where(eq(eventAssignmentChangeRequests.id, requestId))
      .limit(1);

    const request = requestRows[0];
    if (!request) {
      return { success: false, error: "Change request not found" };
    }

    if (request.status !== "pending") {
      return {
        success: false,
        error: "This request has already been processed",
      };
    }

    const type = deriveType(request.userFromId, request.userToId);

    if (type === "switch" && !request.userToId) {
      return {
        success: false,
        error: "No replacement member has been selected",
      };
    }

    const mayApprove = await canApproveChange({
      eventId: request.eventId,
      userFromId: request.userFromId,
      userToId: request.userToId,
    });
    if (!mayApprove) {
      return { success: false, error: "Forbidden" };
    }

    const ctx = await getUserContext();

    await db.transaction(async (tx) => {
      if (type === "helper") {
        await tx.insert(eventAssignments).values({
          eventId: request.eventId,
          userId: request.userToId!,
          taskId: null,
          blockName: null,
          createdBy: ctx.userName,
          updatedBy: ctx.userName,
        });
      } else if (type === "cancellation") {
        await tx
          .delete(eventAssignments)
          .where(
            and(
              eq(eventAssignments.eventId, request.eventId),
              eq(eventAssignments.userId, request.userFromId!),
            ),
          );
      } else {
        const assignmentRows = await db
          .select({
            id: eventAssignments.id,
          })
          .from(eventAssignments)
          .where(
            and(
              eq(eventAssignments.eventId, request.eventId),
              eq(eventAssignments.userId, request.userFromId!),
            ),
          );

        for (const assignment of assignmentRows) {
          await tx
            .update(eventAssignments)
            .set({
              userId: request.userToId!,
              updatedAt: new Date(),
              updatedBy: ctx.userName,
            })
            .where(eq(eventAssignments.id, assignment.id));
        }
      }

      await tx
        .update(eventAssignmentChangeRequests)
        .set({
          status: "approved",
          approvedBy: Number(ctx.userId),
          approvedAt: new Date(),
          updatedAt: new Date(),
          updatedBy: ctx.userName,
        })
        .where(eq(eventAssignmentChangeRequests.id, requestId));
    });

    return { success: true };
  } catch (err) {
    console.error("[approveChange] error:", err);
    return { success: false, error: "Failed to approve change request" };
  }
}

export async function rejectChange(
  requestId: number,
): Promise<MutationResult> {
  try {
    const requestRows = await db
      .select({
        id: eventAssignmentChangeRequests.id,
        eventId: eventAssignmentChangeRequests.eventId,
        userFromId: eventAssignmentChangeRequests.userFromId,
        userToId: eventAssignmentChangeRequests.userToId,
        status: eventAssignmentChangeRequests.status,
      })
      .from(eventAssignmentChangeRequests)
      .where(eq(eventAssignmentChangeRequests.id, requestId))
      .limit(1);

    const request = requestRows[0];
    if (!request) {
      return { success: false, error: "Change request not found" };
    }

    if (request.status !== "pending") {
      return {
        success: false,
        error: "This request has already been processed",
      };
    }

    const mayApprove = await canApproveChange({
      eventId: request.eventId,
      userFromId: request.userFromId,
      userToId: request.userToId,
    });
    if (!mayApprove) {
      return { success: false, error: "Forbidden" };
    }

    const ctx = await getUserContext();
    await db
      .update(eventAssignmentChangeRequests)
      .set({
        status: "rejected",
        approvedBy: Number(ctx.userId),
        approvedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: ctx.userName,
      })
      .where(eq(eventAssignmentChangeRequests.id, requestId));

    return { success: true };
  } catch (err) {
    console.error("[rejectChange] error:", err);
    return { success: false, error: "Failed to reject change request" };
  }
}
