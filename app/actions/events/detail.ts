"use server";

import { type LegacyWebContext, webFetch } from "@/app/actions/_shared";
import { requiresReauth } from "@/lib/parsers/events";
import { parseEventPage } from "@/lib/parsers/event-details";
import { EventDetail } from "@/types/event";

export async function getEventDetail(
  ctx: LegacyWebContext,
  id: string,
): Promise<EventDetail> {
  const baseUrl = process.env.SC_BASE_URL!;
  const url = `${baseUrl}/event/edit/${id}`;
  const res = await webFetch("getEventDetail", url, ctx, {
    headers: { Referer: `${baseUrl}/event` },
  });
  if (res.code >= 400) {
    throw new Error(`Failed to fetch event edit page: ${res.code}`);
  }
  if (requiresReauth(res.body)) {
    throw new Error("SESSION_EXPIRED");
  }
  return parseEventPage(Number(id), res.body);
}
