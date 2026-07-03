"use server";

import { type LegacyWebContext, webFetch } from "@/actions/legacy-web/_shared";
import { requiresReauth } from "@/lib/parsers/events";
import { parseEventAllUsers } from "@/lib/parsers/event-details";
import { EventUser } from "@/types/event";

const SAMPLE_EVENT_ID = 95469;

export async function fetchAllUsers(
  ctx: LegacyWebContext,
): Promise<EventUser[]> {
  const baseUrl = process.env.SC_BASE_URL!;
  const url = `${baseUrl}/event/edit/${SAMPLE_EVENT_ID}`;
  const res = await webFetch("fetchAllUsers", url, ctx, {
    headers: { Referer: `${baseUrl}/event` },
  });
  if (res.code >= 400) {
    throw new Error(`Failed to fetch event edit page: ${res.code}`);
  }
  if (requiresReauth(res.body)) {
    throw new Error("SESSION_EXPIRED");
  }
  return parseEventAllUsers(res.body);
}
