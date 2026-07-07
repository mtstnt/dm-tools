"use server";

import { desc, sql } from "drizzle-orm";
import { db } from "@/db/connection";
import { auditTrails } from "@/db/schema";
import { checkPermission } from "@/actions/master/_shared";

const AUDIT_TRAIL_PAGE_SIZE = 20;

export type AuditTrail = {
  id: number;
  resource: string;
  recordId: number;
  action: string;
  userId: number | null;
  userName: string;
  oldData: string;
  newData: string;
  changedAt: Date;
};

export type AuditTrailListResult =
  | {
      success: true;
      data: AuditTrail[];
      totalCount: number;
      pageSize: number;
      page: number;
    }
  | {
      success: false;
      error: string;
    };

export async function getAuditTrails(
  inputPage: number,
): Promise<AuditTrailListResult> {
  const allowed = await checkPermission("audit_trails", "read");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const page = Math.max(1, inputPage);
  const offset = (page - 1) * AUDIT_TRAIL_PAGE_SIZE;

  try {
    const countRows = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(auditTrails);

    const totalCount = countRows[0]?.count ?? 0;

    const rows = await db
      .select({
        id: auditTrails.id,
        resource: auditTrails.resource,
        recordId: auditTrails.recordId,
        action: auditTrails.action,
        userId: auditTrails.userId,
        userName: auditTrails.userName,
        oldData: auditTrails.oldData,
        newData: auditTrails.newData,
        changedAt: auditTrails.changedAt,
      })
      .from(auditTrails)
      .orderBy(desc(auditTrails.changedAt))
      .limit(AUDIT_TRAIL_PAGE_SIZE)
      .offset(offset);

    return {
      success: true,
      data: rows,
      totalCount,
      pageSize: AUDIT_TRAIL_PAGE_SIZE,
      page,
    };
  } catch (err) {
    console.error("[getAuditTrails] error:", err);
    return { success: false, error: "Failed to load audit trails" };
  }
}
