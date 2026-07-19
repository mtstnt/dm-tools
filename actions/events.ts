"use server";

import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/connection";
import {
  eventAssignments,
  eventTeams,
  eventTypes,
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

export async function getEventCreationOptions(): Promise<EventCreationOptionsResult> {
  const allowed = await checkPermission("events", "create");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
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
      success: true,
      data: {
        regions: regionRows,
        eventTypes: eventTypeRows,
        teams: teamRows,
        members: memberRows,
      },
    };
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
