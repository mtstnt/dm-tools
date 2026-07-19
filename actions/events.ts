"use server";

import { and, asc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/connection";
import {
  eventAltarCalls,
  eventAssignmentChangeRequests,
  eventAssignments,
  eventMetrics,
  eventTeams,
  eventTypes,
  eventVolunteers,
  events,
  regions,
  tasks,
  teams,
  users,
  type EventMode,
  type EventStatus,
} from "@/db/schema";
import {
  checkPermission,
  getUserContext,
  logAuditTrail,
} from "@/actions/master/_shared";

export type EventScheduleItem = {
  id: number;
  name: string;
  date: Date;
  status: EventStatus;
  regionName: string;
  eventTypeName: string;
  mode?: EventMode;
  requiresApplication: boolean;
  teams: {
    id: number;
    number: number;
  }[];
};

export type EventConfiguration = {
  field: string;
  value: string;
};

export type EventDetailData = {
  id: number;
  name: string;
  date: Date;
  status: EventStatus;
  regionName: string;
  eventTypeName: string;
  mode: EventMode;
  allUsers: {
    id: number;
    fullName: string;
    email: string;
  }[];
  assignments: {
    id: number;
    fullName: string;
    email: string;
    assignedBlockIds: number[];
    taskIds: number[];
  }[];
};

export type EventDetailResult = {
  success: boolean;
  data?: EventDetailData;
  error?: string;
};

export type EventConfigurationResult = {
  success: boolean;
  data?: EventConfiguration[];
  error?: string;
};

export type EventCreationOptions = {
  regions: {
    id: number;
    name: string;
  }[];
  eventTypes: {
    id: number;
    name: string;
  }[];
  teams: {
    id: number;
    number: number;
    regionId: number;
    regionName: string;
  }[];
  members: {
    id: number;
    fullName: string;
    email: string;
    teamId: number | null;
    teamNumber: number | null;
  }[];
};

export type EventCreationOptionsResult = {
  success: boolean;
  data?: EventCreationOptions;
  error?: string;
};

const assignmentModeSchema = z.enum(["teams", "members", "manual_apply"]);

const createEventItemSchema = z.object({
  regionId: z.coerce.number().int().positive("Region is required"),
  eventTypeId: z.coerce.number().int().positive("Event type is required"),
  customName: z.string().trim().optional(),
  date: z.string().min(1, "Event date is required"),
  mode: assignmentModeSchema.default("teams"),
  teamIds: z.array(z.coerce.number().int().positive()).default([]),
  memberIds: z.array(z.coerce.number().int().positive()).default([]),
  picIds: z.array(z.coerce.number().int().positive()).default([]),
}).refine(
  (data) => {
    if (data.mode === "teams" && data.teamIds.length === 0) {
      return false;
    }
    return true;
  },
  { message: "Select at least one team", path: ["teamIds"] },
).refine(
  (data) => {
    if (data.mode === "members" && data.memberIds.length === 0 && data.picIds.length === 0) {
      return false;
    }
    return true;
  },
  { message: "Select at least one member or PIC", path: ["memberIds"] },
);

const createEventsSchema = z.object({
  events: z
    .array(createEventItemSchema)
    .min(1, "Add at least one event to create"),
});

const eventConfigurationSchema = z.array(
  z.object({
    field: z.string().trim().min(1, "Configuration field is required"),
    value: z.string(),
  }),
);

export type CreateEventsInput = z.input<typeof createEventsSchema>;

export type CreateEventsResult = {
  success: boolean;
  createdCount?: number;
  eventIds?: number[];
  error?: string;
};

export type EventScheduleResult = {
  success: boolean;
  data?: EventScheduleItem[];
  error?: string;
};

export async function getEventSchedule(
  month: number,
  year: number,
): Promise<EventScheduleResult> {
  const allowed = await checkPermission("events", "read");
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
    const rows = await db
      .select({
        id: events.id,
        name: events.name,
        date: events.date,
        status: events.status,
        regionName: regions.name,
        eventTypeName: eventTypes.name,
        mode: events.mode,
        teamId: teams.id,
        teamNumber: teams.number,
      })
      .from(events)
      .innerJoin(regions, eq(events.regionId, regions.id))
      .innerJoin(eventTypes, eq(events.eventTypeId, eventTypes.id))
      .leftJoin(eventTeams, eq(events.id, eventTeams.eventId))
      .leftJoin(teams, eq(eventTeams.teamId, teams.id))
      .where(and(gte(events.date, startDate), lt(events.date, endDate)))
      .orderBy(asc(events.date), asc(events.name), asc(teams.number));

    const eventMap = new Map<number, EventScheduleItem>();

    for (const row of rows) {
      const existing = eventMap.get(row.id);

      if (existing) {
        if (row.teamId !== null && row.teamNumber !== null) {
          existing.teams.push({ id: row.teamId, number: row.teamNumber });
        }
        continue;
      }

      eventMap.set(row.id, {
        id: row.id,
        name: row.name,
        date: row.date,
        status: row.status,
        regionName: row.regionName,
        eventTypeName: row.eventTypeName,
        mode: row.mode,
        requiresApplication: row.mode === "manual_apply",
        teams:
          row.teamId !== null && row.teamNumber !== null
            ? [{ id: row.teamId, number: row.teamNumber }]
            : [],
      });
    }

    return { success: true, data: Array.from(eventMap.values()) };
  } catch (err) {
    console.error("[getEventSchedule] error:", err);
    return { success: false, error: "Failed to load events" };
  }
}

export type EventScheduleYearsResult = {
  success: boolean;
  data?: number[];
  error?: string;
};

export async function getEventScheduleYears(): Promise<EventScheduleYearsResult> {
  const allowed = await checkPermission("events", "read");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const rows = await db
      .select({
        year: sql<number>`cast(strftime('%Y', ${events.date} / 1000, 'unixepoch') as integer)`,
      })
      .from(events)
      .groupBy(sql`strftime('%Y', ${events.date} / 1000, 'unixepoch')`)
      .orderBy(sql`strftime('%Y', ${events.date} / 1000, 'unixepoch')`);

    const years = rows.map((row) => row.year).filter(Boolean);
    return { success: true, data: years };
  } catch (err) {
    console.error("[getEventScheduleYears] error:", err);
    return { success: false, error: "Failed to load event years" };
  }
}

export async function getEventDetail(eventId: number): Promise<EventDetailResult> {
  const allowed = await checkPermission("events", "read");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  if (!Number.isInteger(eventId) || eventId <= 0) {
    return { success: false, error: "Event not found" };
  }

  try {
    const [eventRows, userRows, assignmentRows] = await Promise.all([
      db
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
        .where(eq(events.id, eventId))
        .limit(1),
      db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
        })
        .from(users)
        .orderBy(asc(users.fullName)),
      db
        .select({
          userId: users.id,
          fullName: users.fullName,
          email: users.email,
          taskId: eventAssignments.taskId,
          blockId: eventAssignments.blockName,
        })
        .from(eventAssignments)
        .innerJoin(users, eq(eventAssignments.userId, users.id))
        .where(eq(eventAssignments.eventId, eventId))
        .orderBy(asc(users.fullName)),
    ]);

    const event = eventRows[0];
    if (!event) {
      return { success: false, error: "Event not found" };
    }

    const assignmentMap = new Map<number, EventDetailData["assignments"][number]>();
    for (const row of assignmentRows) {
      const assignment = assignmentMap.get(row.userId) ?? {
        id: row.userId,
        fullName: row.fullName,
        email: row.email,
        assignedBlockIds: [],
        taskIds: [],
      };

      const blockId = Number(row.blockId);
      if (Number.isInteger(blockId) && !assignment.assignedBlockIds.includes(blockId)) {
        assignment.assignedBlockIds.push(blockId);
      }
      if (row.taskId !== null && !assignment.taskIds.includes(row.taskId)) {
        assignment.taskIds.push(row.taskId);
      }
      assignmentMap.set(row.userId, assignment);
    }

    return {
      success: true,
      data: {
        ...event,
        allUsers: userRows,
        assignments: Array.from(assignmentMap.values()),
      },
    };
  } catch (err) {
    console.error("[getEventDetail] error:", err);
    return { success: false, error: "Failed to load event" };
  }
}

export async function getEventConfiguration(
  eventId: number,
): Promise<EventConfigurationResult> {
  const allowed = await checkPermission("events", "read");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const rows = await db
      .select({ configuration: events.configuration })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (rows.length === 0) {
      return { success: false, error: "Event not found" };
    }

    return { success: true, data: rows[0].configuration };
  } catch (err) {
    console.error("[getEventConfiguration] error:", err);
    return { success: false, error: "Failed to load event configuration" };
  }
}

export async function updateEventConfiguration(
  eventId: number,
  input: EventConfiguration[],
): Promise<EventConfigurationResult> {
  const allowed = await checkPermission("events", "update");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const parseResult = eventConfigurationSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map((issue) => issue.message).join(", "),
    };
  }

  try {
    const ctx = await getUserContext();
    const existing = await db
      .select({ configuration: events.configuration })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (existing.length === 0) {
      return { success: false, error: "Event not found" };
    }

    const [updated] = await db
      .update(events)
      .set({
        configuration: parseResult.data,
        updatedAt: new Date(),
        updatedBy: ctx.userId,
      })
      .where(eq(events.id, eventId))
      .returning({ configuration: events.configuration });

    await logAuditTrail(
      "events",
      eventId,
      "update",
      { configuration: existing[0].configuration },
      { configuration: updated.configuration },
    );

    return { success: true, data: updated.configuration };
  } catch (err) {
    console.error("[updateEventConfiguration] error:", err);
    return { success: false, error: "Failed to update event configuration" };
  }
}

async function _loadEventCreationOptions(): Promise<EventCreationOptions> {
  const [regionRows, eventTypeRows, teamRows, memberRows] = await Promise.all([
    db
      .select({
        id: regions.id,
        name: regions.name,
      })
      .from(regions)
      .orderBy(asc(regions.name)),
    db
      .select({
        id: eventTypes.id,
        name: eventTypes.name,
      })
      .from(eventTypes)
      .orderBy(asc(eventTypes.name)),
    db
      .select({
        id: teams.id,
        number: teams.number,
        regionId: teams.regionId,
        regionName: regions.name,
      })
      .from(teams)
      .innerJoin(regions, eq(teams.regionId, regions.id))
      .orderBy(asc(teams.number)),
    db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        teamId: users.teamId,
        teamNumber: teams.number,
      })
      .from(users)
      .leftJoin(teams, eq(users.teamId, teams.id))
      .orderBy(asc(users.fullName)),
  ]);

  return {
    regions: regionRows,
    eventTypes: eventTypeRows,
    teams: teamRows,
    members: memberRows,
  };
}

export async function getEventCreationOptions(): Promise<EventCreationOptionsResult> {
  const allowed = await checkPermission("events", "create");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const data = await _loadEventCreationOptions();
    return { success: true, data };
  } catch (err) {
    console.error("[getEventCreationOptions] error:", err);
    return { success: false, error: "Failed to load event creation options" };
  }
}

export async function createEvents(
  input: CreateEventsInput,
): Promise<CreateEventsResult> {
  const allowed = await checkPermission("events", "create");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const parseResult = createEventsSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map((err) => err.message).join(", "),
    };
  }

  const eventInputs = parseResult.data.events;
  const usesTeams = eventInputs.some((event) => event.mode === "teams");
  const usesAssignments = eventInputs.some(
    (event) => event.mode === "members" || event.picIds.length > 0,
  );

  if (usesTeams && !(await checkPermission("event_teams", "create"))) {
    return { success: false, error: "Forbidden" };
  }

  if (usesAssignments && !(await checkPermission("event_assignments", "create"))) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const [regionRows, eventTypeRows, teamRows, memberRows, picTaskRows] =
      await Promise.all([
        db.select({ id: regions.id }).from(regions),
        db
          .select({ id: eventTypes.id, name: eventTypes.name })
          .from(eventTypes),
        db.select({ id: teams.id }).from(teams),
        db.select({ id: users.id }).from(users),
        db
          .select({ id: tasks.id })
          .from(tasks)
          .where(eq(tasks.name, "Event PIC"))
          .limit(1),
      ]);

    const regionIds = new Set(regionRows.map((row) => row.id));
    const eventTypeMap = new Map(eventTypeRows.map((row) => [row.id, row]));
    const teamIds = new Set(teamRows.map((row) => row.id));
    const memberIds = new Set(memberRows.map((row) => row.id));
    const picTaskId = picTaskRows[0]?.id;

    if (usesAssignments && !picTaskId) {
      return { success: false, error: 'Task "Event PIC" is missing' };
    }

    const normalizedEvents = eventInputs.map((event, index) => {
      const itemNumber = index + 1;
      const eventType = eventTypeMap.get(event.eventTypeId);
      const eventDate = new Date(event.date);
      const uniqueTeamIds = Array.from(new Set(event.teamIds));
      const uniqueMemberIds = Array.from(new Set(event.memberIds));
      const uniquePicIds = Array.from(new Set(event.picIds));
      const isCustomEvent = eventType?.name.trim().toUpperCase() === "CUSTOM";
      const eventName = isCustomEvent
        ? event.customName?.trim()
        : eventType?.name.trim();

      if (!regionIds.has(event.regionId)) {
        throw new Error(`Event ${itemNumber}: selected region was not found`);
      }

      if (!eventType) {
        throw new Error(`Event ${itemNumber}: selected event type was not found`);
      }

      if (eventType.name.trim().length === 0) {
        throw new Error(`Event ${itemNumber}: event type name is invalid`);
      }

      if (Number.isNaN(eventDate.getTime())) {
        throw new Error(`Event ${itemNumber}: event date is invalid`);
      }

      if (!eventName || eventName.length === 0) {
        throw new Error(
          isCustomEvent
            ? `Event ${itemNumber}: custom event name is required`
            : `Event ${itemNumber}: event type has no name`,
        );
      }

      if (event.mode === "teams") {
        if (uniqueTeamIds.length === 0) {
          throw new Error(`Event ${itemNumber}: select at least one team`);
        }

        for (const teamId of uniqueTeamIds) {
          if (!teamIds.has(teamId)) {
            throw new Error(
              `Event ${itemNumber}: team with ID ${teamId} does not exist`,
            );
          }
        }
      }

      if (event.mode === "members") {
        if (uniqueMemberIds.length === 0 && uniquePicIds.length === 0) {
          throw new Error(`Event ${itemNumber}: select at least one member or PIC`);
        }
      }

      for (const userId of [...uniqueMemberIds, ...uniquePicIds]) {
        if (!memberIds.has(userId)) {
          throw new Error(
            `Event ${itemNumber}: member with ID ${userId} does not exist`,
          );
        }
      }

      return {
        ...event,
        name: eventName,
        date: eventDate,
        teamIds: uniqueTeamIds,
        memberIds: uniqueMemberIds,
        picIds: uniquePicIds,
      };
    });

    const ctx = await getUserContext();
    const now = new Date();
    const createdEvents: {
      id: number;
      regionId: number;
      eventTypeId: number;
      date: Date;
      name: string;
      mode: EventMode;
    }[] = [];

    await db.transaction(async (tx) => {
      for (const event of normalizedEvents) {
        const [createdEvent] = await tx
          .insert(events)
          .values({
            regionId: event.regionId,
            eventTypeId: event.eventTypeId,
            date: event.date,
            name: event.name,
            mode: event.mode,
            createdAt: now,
            updatedAt: now,
            createdBy: ctx.userId,
            updatedBy: ctx.userId,
          })
          .returning({
            id: events.id,
            regionId: events.regionId,
            eventTypeId: events.eventTypeId,
            date: events.date,
            name: events.name,
            mode: events.mode,
          });

        createdEvents.push(createdEvent);

        if (event.mode === "teams") {
          await tx.insert(eventTeams).values(
            event.teamIds.map((teamId) => ({
              eventId: createdEvent.id,
              teamId,
              createdAt: now,
              updatedAt: now,
              createdBy: ctx.userId,
              updatedBy: ctx.userId,
            })),
          );

          const teamMemberRows = await tx
            .select({ id: users.id })
            .from(users)
            .where(inArray(users.teamId, event.teamIds));

          if (teamMemberRows.length > 0) {
            await tx.insert(eventAssignments).values(
              teamMemberRows.map((m) => ({
                eventId: createdEvent.id,
                userId: m.id,
                taskId: null,
                createdAt: now,
                updatedAt: now,
                createdBy: ctx.userId,
                updatedBy: ctx.userId,
              })),
            );
          }
        }

        if (event.mode === "members" || event.picIds.length > 0) {
          const picIds = new Set(event.picIds);
          const directMemberIds = event.memberIds.filter((userId) => !picIds.has(userId));
          const assignmentRows = [
            ...directMemberIds.map((userId) => ({
              eventId: createdEvent.id,
              userId,
              taskId: null,
              createdAt: now,
              updatedAt: now,
              createdBy: ctx.userId,
              updatedBy: ctx.userId,
            })),
            ...event.picIds.map((userId) => ({
              eventId: createdEvent.id,
              userId,
              taskId: picTaskId ?? null,
              createdAt: now,
              updatedAt: now,
              createdBy: ctx.userId,
              updatedBy: ctx.userId,
            })),
          ];

          if (assignmentRows.length > 0) {
            await tx.insert(eventAssignments).values(assignmentRows);
          }
        }
      }
    });

    for (const event of createdEvents) {
      await logAuditTrail("events", event.id, "create", {}, event);
    }

    return {
      success: true,
      createdCount: createdEvents.length,
      eventIds: createdEvents.map((event) => event.id),
    };
  } catch (err) {
    console.error("[createEvents] error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create events",
    };
  }
}

export type EventForEditData = {
  id: number;
  regionId: number;
  eventTypeId: number;
  name: string;
  date: Date;
  mode: EventMode;
  teamIds: number[];
  memberIds: number[];
  picIds: number[];
  options: EventCreationOptions;
};

export type EventForEditResult = {
  success: boolean;
  data?: EventForEditData;
  error?: string;
};

export async function getEventForEdit(
  eventId: number,
): Promise<EventForEditResult> {
  const allowed = await checkPermission("events", "update");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  if (!Number.isInteger(eventId) || eventId <= 0) {
    return { success: false, error: "Event not found" };
  }

  try {
    const [
      eventRows,
      teamRows,
      assignmentRows,
      picTaskRow,
      options,
    ] = await Promise.all([
      db
        .select({
          id: events.id,
          regionId: events.regionId,
          eventTypeId: events.eventTypeId,
          name: events.name,
          date: events.date,
          mode: events.mode,
        })
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1),
      db
        .select({ teamId: eventTeams.teamId })
        .from(eventTeams)
        .where(eq(eventTeams.eventId, eventId)),
      db
        .select({
          userId: eventAssignments.userId,
          taskId: eventAssignments.taskId,
        })
        .from(eventAssignments)
        .where(
          and(
            eq(eventAssignments.eventId, eventId),
            isNull(eventAssignments.blockName),
            isNull(eventAssignments.rating),
          ),
        ),
      db
        .select({ id: tasks.id })
        .from(tasks)
        .where(eq(tasks.name, "Event PIC"))
        .limit(1),
      _loadEventCreationOptions(),
    ]);

    const event = eventRows[0];
    if (!event) {
      return { success: false, error: "Event not found" };
    }

    const picTaskId = picTaskRow[0]?.id;
    const teamIds = teamRows.map((row) => row.teamId);
    const memberIds: number[] = [];
    const picIds: number[] = [];

    for (const row of assignmentRows) {
      if (row.taskId === picTaskId) {
        picIds.push(row.userId);
      } else {
        memberIds.push(row.userId);
      }
    }

    return {
      success: true,
      data: {
        ...event,
        teamIds,
        memberIds,
        picIds,
        options,
      },
    };
  } catch (err) {
    console.error("[getEventForEdit] error:", err);
    return { success: false, error: "Failed to load event" };
  }
}

export type UpdateEventResult = {
  success: boolean;
  error?: string;
};

export async function updateEvent(
  eventId: number,
  input: CreateEventsInput["events"][number],
): Promise<UpdateEventResult> {
  const allowed = await checkPermission("events", "update");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const parseResult = createEventItemSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map((issue) => issue.message).join(", "),
    };
  }

  const event = parseResult.data;

  if (event.mode === "teams") {
    if (!(await checkPermission("event_teams", "create"))) {
      return { success: false, error: "Forbidden" };
    }
  }

  if (
    event.mode === "members" ||
    event.picIds.length > 0
  ) {
    if (!(await checkPermission("event_assignments", "create"))) {
      return { success: false, error: "Forbidden" };
    }
  }

  try {
    const [
      regionRows,
      eventTypeRows,
      teamRows,
      memberRows,
      picTaskRows,
      existingEventRows,
    ] = await Promise.all([
      db.select({ id: regions.id }).from(regions),
      db
        .select({ id: eventTypes.id, name: eventTypes.name })
        .from(eventTypes),
      db.select({ id: teams.id }).from(teams),
      db.select({ id: users.id }).from(users),
      db
        .select({ id: tasks.id })
        .from(tasks)
        .where(eq(tasks.name, "Event PIC"))
        .limit(1),
      db
        .select({
          id: events.id,
          name: events.name,
          date: events.date,
          mode: events.mode,
          regionId: events.regionId,
          eventTypeId: events.eventTypeId,
        })
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1),
    ]);

    const existing = existingEventRows[0];
    if (!existing) {
      return { success: false, error: "Event not found" };
    }

    const regionIdSet = new Set(regionRows.map((row) => row.id));
    const eventTypeMap = new Map(
      eventTypeRows.map((row) => [row.id, row]),
    );
    const teamIdSet = new Set(teamRows.map((row) => row.id));
    const memberIdSet = new Set(memberRows.map((row) => row.id));
    const picTaskId = picTaskRows[0]?.id;

    if ((event.mode === "members" || event.picIds.length > 0) && !picTaskId) {
      return { success: false, error: 'Task "Event PIC" is missing' };
    }

    if (!regionIdSet.has(event.regionId)) {
      return { success: false, error: "Selected region was not found" };
    }

    const eventType = eventTypeMap.get(event.eventTypeId);
    if (!eventType) {
      return { success: false, error: "Selected event type was not found" };
    }

    const eventDate = new Date(event.date);
    if (Number.isNaN(eventDate.getTime())) {
      return { success: false, error: "Event date is invalid" };
    }

    const isCustomEvent =
      eventType.name.trim().toUpperCase() === "CUSTOM";
    const eventName = isCustomEvent
      ? event.customName?.trim()
      : eventType.name.trim();

    if (!eventName || eventName.length === 0) {
      return {
        success: false,
        error: isCustomEvent
          ? "Custom event name is required"
          : "Event type has no name",
      };
    }

    const uniqueTeamIds = Array.from(new Set(event.teamIds));
    const uniqueMemberIds = Array.from(new Set(event.memberIds));
    const uniquePicIds = Array.from(new Set(event.picIds));

    if (event.mode === "teams") {
      if (uniqueTeamIds.length === 0) {
        return {
          success: false,
          error: "Select at least one team",
        };
      }

      for (const teamId of uniqueTeamIds) {
        if (!teamIdSet.has(teamId)) {
          return {
            success: false,
            error: `Team with ID ${teamId} does not exist`,
          };
        }
      }
    }

    if (event.mode === "members") {
      if (uniqueMemberIds.length === 0 && uniquePicIds.length === 0) {
        return {
          success: false,
          error: "Select at least one member or PIC",
        };
      }
    }

    for (const userId of [...uniqueMemberIds, ...uniquePicIds]) {
      if (!memberIdSet.has(userId)) {
        return {
          success: false,
          error: `Member with ID ${userId} does not exist`,
        };
      }
    }

    const ctx = await getUserContext();
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(events)
        .set({
          regionId: event.regionId,
          eventTypeId: event.eventTypeId,
          date: eventDate,
          name: eventName,
          mode: event.mode,
          updatedAt: now,
          updatedBy: ctx.userId,
        })
        .where(eq(events.id, eventId));

      await tx.delete(eventTeams).where(eq(eventTeams.eventId, eventId));

      await tx
        .delete(eventAssignments)
        .where(
          and(
            eq(eventAssignments.eventId, eventId),
            isNull(eventAssignments.blockName),
            isNull(eventAssignments.rating),
          ),
        );

      if (event.mode === "teams") {
        await tx.insert(eventTeams).values(
          uniqueTeamIds.map((teamId) => ({
            eventId,
            teamId,
            createdAt: now,
            updatedAt: now,
            createdBy: ctx.userId,
            updatedBy: ctx.userId,
          })),
        );

        const teamMemberRows = await tx
          .select({ id: users.id })
          .from(users)
          .where(inArray(users.teamId, uniqueTeamIds));

        if (teamMemberRows.length > 0) {
          await tx.insert(eventAssignments).values(
            teamMemberRows.map((m) => ({
              eventId,
              userId: m.id,
              taskId: null,
              createdAt: now,
              updatedAt: now,
              createdBy: ctx.userId,
              updatedBy: ctx.userId,
            })),
          );
        }
      }

      if (event.mode === "members" || uniquePicIds.length > 0) {
        const pics = new Set(uniquePicIds);
        const members = uniqueMemberIds.filter(
          (userId) => !pics.has(userId),
        );
        const assignmentRows = [
          ...members.map((userId) => ({
            eventId,
            userId,
            taskId: null as number | null,
            createdAt: now,
            updatedAt: now,
            createdBy: ctx.userId,
            updatedBy: ctx.userId,
          })),
          ...uniquePicIds.map((userId) => ({
            eventId,
            userId,
            taskId: picTaskId ?? null,
            createdAt: now,
            updatedAt: now,
            createdBy: ctx.userId,
            updatedBy: ctx.userId,
          })),
        ];

        if (assignmentRows.length > 0) {
          await tx.insert(eventAssignments).values(assignmentRows);
        }
      }
    });

    await logAuditTrail("events", eventId, "update", existing, {
      regionId: event.regionId,
      eventTypeId: event.eventTypeId,
      date: eventDate,
      name: eventName,
      mode: event.mode,
    });

    return { success: true };
  } catch (err) {
    console.error("[updateEvent] error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update event",
    };
  }
}

export type DeleteEventResult = {
  success: boolean;
  error?: string;
};

export async function deleteEvent(
  eventId: number,
): Promise<DeleteEventResult> {
  const allowed = await checkPermission("events", "delete");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  if (!Number.isInteger(eventId) || eventId <= 0) {
    return { success: false, error: "Event not found" };
  }

  try {
    const existing = await db
      .select({
        id: events.id,
        name: events.name,
        date: events.date,
        regionId: events.regionId,
        eventTypeId: events.eventTypeId,
        mode: events.mode,
        status: events.status,
      })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (existing.length === 0) {
      return { success: false, error: "Event not found" };
    }

    await db.transaction(async (tx) => {
      await tx.delete(eventTeams).where(eq(eventTeams.eventId, eventId));
      await tx.delete(eventAssignments).where(eq(eventAssignments.eventId, eventId));
      await tx.delete(eventMetrics).where(eq(eventMetrics.eventId, eventId));
      await tx.delete(eventVolunteers).where(eq(eventVolunteers.eventId, eventId));
      await tx.delete(eventAltarCalls).where(eq(eventAltarCalls.eventId, eventId));
      await tx.delete(eventAssignmentChangeRequests).where(
        eq(eventAssignmentChangeRequests.eventId, eventId),
      );
      await tx.delete(events).where(eq(events.id, eventId));
    });

    await logAuditTrail("events", eventId, "delete", existing[0], {});

    return { success: true };
  } catch (err) {
    console.error("[deleteEvent] error:", err);
    return { success: false, error: "Failed to delete event" };
  }
}
