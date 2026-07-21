"use server";

import { and, asc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { startOfMonth, subMonths, endOfMonth, eachMonthOfInterval, format } from "date-fns";
import { db } from "@/db/connection";
import { events, eventMetrics, eventTypes, metrics, regions } from "@/db/schema";
import { getUserRole } from "@/actions/master/_shared";
import { ROLES, canAccess } from "@/lib/permissions";

export type SeatCounterDataPoint = {
  month: string;
  count: number;
};

export type DashboardFilterOption = {
  id: number;
  name: string;
};

export type DashboardFilterOptions = {
  regions: DashboardFilterOption[];
  eventTypes: DashboardFilterOption[];
};

export type GetSeatCounterDataInput = {
  regionIds: number[];
  eventTypeIds: number[];
};

export type GetSeatCounterDataResult = {
  success: boolean;
  data?: SeatCounterDataPoint[];
  error?: string;
};

export type GetFilterOptionsResult = {
  success: boolean;
  data?: DashboardFilterOptions;
  error?: string;
};

const seatCounterInputSchema = z.object({
  regionIds: z
    .array(z.number().int().positive())
    .min(1, "At least one region is required"),
  eventTypeIds: z
    .array(z.number().int().positive())
    .min(1, "At least one event type is required"),
});

export async function getDashboardFilterOptions(): Promise<GetFilterOptionsResult> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const [regionRows, eventTypeRows] = await Promise.all([
      db
        .select({
          id: regions.id,
          name: regions.name,
        })
        .from(regions)
        .orderBy(regions.name),
      db
        .select({
          id: eventTypes.id,
          name: eventTypes.name,
        })
        .from(eventTypes)
        .orderBy(eventTypes.name),
    ]);

    return {
      success: true,
      data: {
        regions: regionRows,
        eventTypes: eventTypeRows,
      },
    };
  } catch (err) {
    console.error("[getDashboardFilterOptions] error:", err);
    return { success: false, error: "Failed to load filter options" };
  }
}

export async function getSeatCounterData(
  input: GetSeatCounterDataInput,
): Promise<GetSeatCounterDataResult> {
  const allowed = canAccess(await getUserRole(), [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC]);
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const parseResult = seatCounterInputSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map((err) => err.message).join(", "),
    };
  }

  const { regionIds, eventTypeIds } = parseResult.data;

  const now = new Date();
  const startDate = startOfMonth(subMonths(now, 5));
  const endDate = endOfMonth(now);

  try {
    const monthKeyExpr = sql`strftime('%Y-%m', datetime(${events.date}, 'unixepoch'))`;

    const rows = await db
      .select({
        monthKey: sql<string>`${monthKeyExpr}`,
        totalCount: sql<number>`COALESCE(SUM(${eventMetrics.count}), 0)`,
      })
      .from(eventMetrics)
      .innerJoin(events, eq(eventMetrics.eventId, events.id))
      .innerJoin(metrics, eq(eventMetrics.metricId, metrics.id))
      .innerJoin(eventTypes, eq(events.eventTypeId, eventTypes.id))
      .innerJoin(regions, eq(events.regionId, regions.id))
      .where(
        and(
          eq(metrics.name, "Seat Counter"),
          inArray(eventTypes.id, eventTypeIds),
          inArray(regions.id, regionIds),
          gte(events.date, startDate),
          lt(events.date, endDate),
        ),
      )
      .groupBy(monthKeyExpr)
      .orderBy(asc(monthKeyExpr));

    const dataMap = new Map(
      rows.map((r) => [r.monthKey, Number(r.totalCount)]),
    );

    const allMonths = eachMonthOfInterval({ start: startDate, end: endDate });
    const result: SeatCounterDataPoint[] = allMonths.map((month) => {
      const key = format(month, "yyyy-MM");
      return { month: key, count: dataMap.get(key) ?? 0 };
    });

    return { success: true, data: result };
  } catch (err) {
    console.error("[getSeatCounterData] error:", err);
    return { success: false, error: "Failed to load seat counter data" };
  }
}
