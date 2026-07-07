"use server";

import { asc, eq } from "drizzle-orm";
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
  regionName: string;
  eventTypeName: string;
  mode?: EventMode;
  requiresApplication: boolean;
  teams: {
    id: number;
    number: number;
  }[];
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
});

const createEventsSchema = z.object({
  events: z
    .array(createEventItemSchema)
    .min(1, "Add at least one event to create"),
});

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

export async function getEventSchedule(): Promise<EventScheduleResult> {
  const allowed = await checkPermission("events", "read");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const rows = await db
      .select({
        id: events.id,
        name: events.name,
        date: events.date,
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
  const usesMembers = eventInputs.some((event) => event.mode === "members");

  if (usesTeams && !(await checkPermission("event_teams", "create"))) {
    return { success: false, error: "Forbidden" };
  }

  if (usesMembers && !(await checkPermission("event_assignments", "create"))) {
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

    if (usesMembers && !picTaskId) {
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
      const eventName = isCustomEvent ? event.customName?.trim() : eventType?.name;

      if (!regionIds.has(event.regionId)) {
        throw new Error(`Event ${itemNumber}: selected region was not found`);
      }

      if (!eventType) {
        throw new Error(`Event ${itemNumber}: selected event type was not found`);
      }

      if (Number.isNaN(eventDate.getTime())) {
        throw new Error(`Event ${itemNumber}: event date is invalid`);
      }

      if (!eventName) {
        throw new Error(`Event ${itemNumber}: custom event name is required`);
      }

      if (event.mode === "teams") {
        if (uniqueTeamIds.length === 0) {
          throw new Error(`Event ${itemNumber}: select at least one team`);
        }

        for (const teamId of uniqueTeamIds) {
          if (!teamIds.has(teamId)) {
            throw new Error(`Event ${itemNumber}: selected team was not found`);
          }
        }
      }

      if (event.mode === "members") {
        if (uniqueMemberIds.length === 0 && uniquePicIds.length === 0) {
          throw new Error(`Event ${itemNumber}: select at least one member or PIC`);
        }

        for (const userId of [...uniqueMemberIds, ...uniquePicIds]) {
          if (!memberIds.has(userId)) {
            throw new Error(`Event ${itemNumber}: selected member was not found`);
          }
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

        if (event.mode === "members") {
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
