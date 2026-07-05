"use server";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { eventTeams, eventTypes, events, regions, teams } from "@/db/schema";
import { checkPermission } from "@/actions/master/_shared";

export type EventScheduleItem = {
  id: number;
  name: string;
  date: Date;
  regionName: string;
  eventTypeName: string;
  requiresApplication: boolean;
  teams: {
    id: number;
    number: number;
  }[];
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
        requiresApplication: false,
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
