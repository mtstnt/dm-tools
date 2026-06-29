"use server";

import { type LegacyWebContext, webFetch } from "@/app/actions/_shared";

export async function updateBlock(
  ctx: LegacyWebContext,
  blockId: string,
  name: string,
  row: number,
  col: number,
  chairsData: number[][],
  userIds: number[],
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = process.env.SC_BASE_URL!;

  const params = new URLSearchParams();
  params.append("_method", "PUT");
  params.append("name", name);
  params.append("row", String(row));
  params.append("column", String(col));
  params.append("chairs_data", JSON.stringify(chairsData));
  for (const userId of userIds) {
    params.append("users[]", String(userId));
  }
  params.append("_csrf", ctx.csrf);

  const res = await webFetch("updateBlock", `${baseUrl}/block/update/${blockId}`, ctx, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: `${baseUrl}/block/edit/${blockId}`,
    },
    body: params.toString(),
  });

  const location = res.headers.get("location");
  if (location) {
    console.log("[updateBlock] redirect detected:", location);
    return { success: true };
  }

  if (res.code >= 400) {
    return { success: false, error: `Request failed (${res.code})` };
  }

  return { success: true };
}
