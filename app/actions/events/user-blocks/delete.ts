"use server";

import { type LegacyWebContext, webFetch } from "@/app/actions/_shared";

export async function removeUserBlock(
  ctx: LegacyWebContext,
  eventId: string,
  userId: number,
  blockId: number,
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = process.env.SC_BASE_URL!;

  const res = await webFetch("removeUserBlock", `${baseUrl}/event/set_users_blocks/${eventId}`, ctx, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      Referer: `${baseUrl}/event/edit/${eventId}`,
      ...(ctx.csrf && { "X-CSRF-Token": ctx.csrf }),
    },
    body: JSON.stringify({ user_id: userId, block_id: blockId }),
  });

  const location = res.headers.get("location");
  if (location) {
    console.log("[removeUserBlock] redirect detected:", location);
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
