"use server";

import { type LegacyWebContext, webFetch } from "@/app/actions/_shared";
import {
  parseEventDetail,
  requiresReauth,
  type EventDetail,
} from "@/lib/parsers/events";

export async function getEvents(
  ctx: LegacyWebContext,
): Promise<EventDetail[]> {
  const baseUrl = process.env.SC_BASE_URL!;

  const pages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const results = await Promise.all(
    pages.map(async (page) => {
      const url = `${baseUrl}/event?page=${page}`;
      const res = await webFetch("getEvents", url, {
        headers: { Cookie: ctx.cookie },
      });
      if (res.code >= 400) {
        throw new Error(`Failed to fetch events page ${page}: ${res.code}`);
      }
      if (requiresReauth(res.body)) {
        throw new Error("SESSION_EXPIRED");
      }
      return parseEventDetail(res.body);
    }),
  );
  const allResults = results.flat();
  return allResults.filter(
    (r) =>
      ["AOG TEEN", "AOG YOUTH"].includes(r?.name ?? "") &&
      r.location == "GMS Surabaya Selatan",
  );
}
