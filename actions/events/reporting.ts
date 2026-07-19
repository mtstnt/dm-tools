"use server";

import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/connection";
import {
  eventMetrics,
  eventVolunteers,
  eventAltarCalls,
  events,
  metrics,
  ministries,
} from "@/db/schema";
import { getUserContext, getUserRole, logAuditTrail } from "@/actions/master/_shared";
import { ROLES, canAccess } from "@/lib/permissions";

const saveReportingSchema = z.object({
  metrics: z.array(
    z.object({
      metricId: z.number().int().positive(),
      count: z.number().int().min(0),
    }),
  ),
  volunteers: z.array(
    z.object({
      ministryId: z.number().int().positive(),
      count: z.number().int().min(0),
    }),
  ),
  altarCalls: z.array(
    z.object({
      description: z.string().trim(),
      count: z.number().int().min(0),
      sequence: z.number().int().min(0),
    }),
  ),
});

export type SaveReportingInput = z.infer<typeof saveReportingSchema>;

export type EventReportingData = {
  metrics: { metricId: number; metricName: string; count: number }[];
  volunteers: { ministryId: number; ministryName: string; count: number }[];
  altarCalls: { description: string; count: number; sequence: number }[];
};

export type EventReportingResult = {
  success: boolean;
  data?: EventReportingData;
  error?: string;
};

export type SaveReportingResult = {
  success: boolean;
  error?: string;
};

export async function getEventReportingData(
  eventId: number,
): Promise<EventReportingResult> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC, ROLES.SPV, ROLES.MEMBER]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const [metricRows, volunteerRows, altarCallRows] = await Promise.all([
      db
        .select({
          metricId: eventMetrics.metricId,
          metricName: metrics.name,
          count: eventMetrics.count,
        })
        .from(eventMetrics)
        .innerJoin(metrics, eq(eventMetrics.metricId, metrics.id))
        .where(eq(eventMetrics.eventId, eventId))
        .orderBy(metrics.name),
      db
        .select({
          ministryId: eventVolunteers.ministryId,
          ministryName: ministries.name,
          count: eventVolunteers.count,
        })
        .from(eventVolunteers)
        .innerJoin(ministries, eq(eventVolunteers.ministryId, ministries.id))
        .where(eq(eventVolunteers.eventId, eventId))
        .orderBy(ministries.name),
      db
        .select({
          description: eventAltarCalls.description,
          count: eventAltarCalls.count,
          sequence: eventAltarCalls.sequence,
        })
        .from(eventAltarCalls)
        .where(eq(eventAltarCalls.eventId, eventId))
        .orderBy(asc(eventAltarCalls.sequence)),
    ]);

    const hasAnyData =
      metricRows.length > 0 ||
      volunteerRows.length > 0 ||
      altarCallRows.length > 0;

    if (!hasAnyData) {
      const [eventRow] = await db
        .select({ date: events.date, status: events.status })
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);

      if (eventRow && new Date(eventRow.date) < new Date() && eventRow.status === "pending") {
        await db
          .update(events)
          .set({ status: "incomplete", updatedAt: new Date() })
          .where(eq(events.id, eventId));
      }
    }

    return {
      success: true,
      data: {
        metrics: metricRows,
        volunteers: volunteerRows,
        altarCalls: altarCallRows,
      },
    };
  } catch (err) {
    console.error("[getEventReportingData] error:", err);
    return { success: false, error: "Failed to load reporting data" };
  }
}

export async function saveEventReportingData(
  eventId: number,
  input: SaveReportingInput,
): Promise<SaveReportingResult> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC, ROLES.SPV]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const parseResult = saveReportingSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map((e) => e.message).join(", "),
    };
  }

  const { metrics: metricInputs, volunteers: volunteerInputs, altarCalls: altarCallInputs } =
    parseResult.data;

  try {
    const ctx = await getUserContext();
    const now = new Date();

    await db.delete(eventMetrics).where(eq(eventMetrics.eventId, eventId));
    await db.delete(eventVolunteers).where(eq(eventVolunteers.eventId, eventId));
    await db.delete(eventAltarCalls).where(eq(eventAltarCalls.eventId, eventId));

    if (metricInputs.length > 0) {
      await db.insert(eventMetrics).values(
        metricInputs.map((m) => ({
          eventId,
          metricId: m.metricId,
          count: m.count,
          createdAt: now,
          updatedAt: now,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        })),
      );
    }

    if (volunteerInputs.length > 0) {
      await db.insert(eventVolunteers).values(
        volunteerInputs.map((v) => ({
          eventId,
          ministryId: v.ministryId,
          count: v.count,
          createdAt: now,
          updatedAt: now,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        })),
      );
    }

    if (altarCallInputs.length > 0) {
      await db.insert(eventAltarCalls).values(
        altarCallInputs.map((a) => ({
          eventId,
          description: a.description,
          count: a.count,
          sequence: a.sequence,
          createdAt: now,
          updatedAt: now,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        })),
      );
    }

    const hasAnyData =
      metricInputs.length > 0 ||
      volunteerInputs.length > 0 ||
      altarCallInputs.length > 0;

    if (hasAnyData) {
      await db
        .update(events)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(events.id, eventId));
    }

    await logAuditTrail(
      "event_reporting",
      eventId,
      "save",
      {},
      { metrics: metricInputs, volunteers: volunteerInputs, altarCalls: altarCallInputs },
    );

    return { success: true };
  } catch (err) {
    console.error("[saveEventReportingData] error:", err);
    return { success: false, error: "Failed to save reporting data" };
  }
}
