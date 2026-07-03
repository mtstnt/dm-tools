"use server";

import { type LegacyWebContext, webFetch } from "@/actions/legacy-web/_shared";

export async function updateUserBlocks(
  ctx: LegacyWebContext,
  eventId: string,
  userIds: number[],
  blockIds: number[],
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = process.env.SC_BASE_URL!;

  const params = new URLSearchParams();
  userIds.forEach((id) => params.append("users[]", String(id)));
  blockIds.forEach((id) => params.append("blocks[]", String(id)));
  params.append("_csrf", ctx.csrf);

  const res = await webFetch("updateUserBlocks", `${baseUrl}/event/update_users_blocks/${eventId}`, ctx, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: `${baseUrl}/event/edit/${eventId}`,
    },
    body: params.toString(),
  });

  const location = res.headers.get("location");
  if (location) {
    console.log("[updateUserBlocks] redirect detected:", location);
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
