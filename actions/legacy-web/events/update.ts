"use server";

import { type LegacyWebContext, webFetch } from "@/actions/legacy-web/_shared";

export async function updateEventUsers(
  ctx: LegacyWebContext,
  eventId: string,
  userIds: string[],
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = process.env.SC_BASE_URL!;

  const params = new URLSearchParams();
  params.append("_method", "PUT");
  params.append("users_data", JSON.stringify(userIds));
  params.append("_csrf", ctx.csrf);

  const res = await webFetch("updateEventUsers", `${baseUrl}/event/update/${eventId}`, ctx, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: `${baseUrl}/event/edit/${eventId}`,
    },
    body: params.toString(),
  });

  const location = res.headers.get("location");
  if (location) {
    console.log("[updateEventUsers] redirect detected:", location);
    return { success: true };
  }

  if (res.headers.get("content-type")?.includes("text/html")) {
    if (
      res.body.includes("Forbidden") &&
      res.body.includes("don't have permission")
    ) {
      return {
        success: false,
        error: "Forbidden: You don't have permission to perform this action.",
      };
    }
  }

  if (res.code >= 400) {
    return { success: false, error: `Request failed (${res.code})` };
  }

  return { success: true };
}
