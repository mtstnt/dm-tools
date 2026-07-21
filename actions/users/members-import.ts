"use server";

import { db } from "@/db/connection";
import { roles, teams, users } from "@/db/schema";
import { getUserContext, getUserRole } from "@/actions/master/_shared";
import { ROLES, canAccess } from "@/lib/permissions";
import { eq, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";
import { Readable } from "stream";
import csv from "csv-parser";

export type CsvValidationError = {
  row: number;
  column: string;
  message: string;
};

export type CsvRowPreview = {
  rowIndex: number;
  status: "NEW" | "UPDATED" | "NO_CHANGE";
  teamNumber: number | null;
  fullName: string;
  cgCode: string;
  nij: string;
  email: string;
  roleName: string;
  changedFields: string[];
};

export type ValidateMembersCsvResult = {
  success: boolean;
  errors?: CsvValidationError[];
  preview?: CsvRowPreview[];
  error?: string;
};

export type ImportMembersResult = {
  success: boolean;
  imported?: number;
  updated?: number;
  skipped?: number;
  error?: string;
};

function parseCsv(csvText: string): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const results: Record<string, string>[] = [];

    Readable.from(csvText)
      .pipe(csv({ headers: false }))
      .on("data", (data: Record<string, string>) => results.push(data))
      .on("end", () => {
        const rows = results.slice(1).map((row) => {
          return Object.keys(row)
            .map(Number)
            .sort((a, b) => a - b)
            .map((k) => (row[k] ?? "").trim());
        });
        resolve(rows);
      })
      .on("error", reject);
  });
}

function passwordFromEmail(email: string): string {
  return email.split("@")[0] ?? email;
}

type ParsedRow = {
  rowIndex: number;
  teamNumber: number | null;
  teamId: number | null;
  fullName: string;
  cgCode: string;
  nij: string;
  email: string;
  roleName: string;
  roleId: number;
};

async function validateAndParse(
  csvText: string,
): Promise<{ errors: CsvValidationError[]; parsed: ParsedRow[] }> {
  const rows = await parseCsv(csvText);
  const errors: CsvValidationError[] = [];

  if (rows.length < 2) {
    errors.push({
      row: 0,
      column: "-",
      message: "CSV must contain at least a header row and one data row",
    });
    return { errors, parsed: [] };
  }

  const dataRows = rows.slice(1);

  const [allRoles, allTeams] = await Promise.all([
    db.select().from(roles),
    db.select().from(teams),
  ]);

  const rolesByName = new Map(allRoles.map((r) => [r.name, r]));
  const teamsByNumber = new Map(allTeams.map((t) => [t.number, t]));

  const parsed: ParsedRow[] = [];
  const seenNijs = new Map<string, number>();

  for (let i = 0; i < dataRows.length; i++) {
    const rowIndex = i + 2;
    const cols = dataRows[i];

    if (cols.length < 6) {
      errors.push({
        row: rowIndex,
        column: "-",
        message: `Expected at least 6 columns, got ${cols.length}`,
      });
      continue;
    }

    const teamCol = cols[0] ?? "";
    const nameCol = cols[1] ?? "";
    const cgCol = cols[2] ?? "";
    const nijCol = cols[3] ?? "";
    const emailCol = cols[4] ?? "";
    const roleCol = cols[5] ?? "";

    let teamNumber: number | null = null;
    let teamId: number | null = null;

    if (teamCol === "") {
      teamNumber = null;
      teamId = null;
    } else {
      const teamMatch = teamCol.match(/^Team (\d+)$/);
      if (!teamMatch) {
        errors.push({
          row: rowIndex,
          column: "Team",
          message: `Invalid format "${teamCol}". Expected "Team {number}" or empty`,
        });
      } else {
        const num = parseInt(teamMatch[1], 10);
        const team = teamsByNumber.get(num);
        if (!team) {
          errors.push({
            row: rowIndex,
            column: "Team",
            message: `Team ${num} not found in database`,
          });
        } else {
          teamNumber = num;
          teamId = team.id;
        }
      }
    }

    if (nameCol === "") {
      errors.push({
        row: rowIndex,
        column: "Nama Lengkap",
        message: "Full name must not be empty",
      });
    }

    if (cgCol === "") {
      errors.push({
        row: rowIndex,
        column: "Kode CG",
        message: "CG code must not be empty",
      });
    }

    if (nijCol === "") {
      errors.push({
        row: rowIndex,
        column: "NIJ",
        message: "NIJ must not be empty",
      });
    } else {
      const prevRow = seenNijs.get(nijCol);
      if (prevRow !== undefined) {
        errors.push({
          row: rowIndex,
          column: "NIJ",
          message: `Duplicate NIJ (also in row ${prevRow})`,
        });
      } else {
        seenNijs.set(nijCol, rowIndex);
      }
    }

    if (emailCol === "") {
      errors.push({
        row: rowIndex,
        column: "Email",
        message: "Email must not be empty",
      });
    }

    let roleName: string | null = null;
    let roleId: number | null = null;

    if (roleCol === "") {
      errors.push({
        row: rowIndex,
        column: "Role",
        message: "Role must not be empty",
      });
    } else {
      const resolvedRole = roleCol === "PIC" ? "Regional PIC" : roleCol;
      const role = rolesByName.get(resolvedRole);
      if (!role) {
        errors.push({
          row: rowIndex,
          column: "Role",
          message: `Role "${resolvedRole}" not found in database`,
        });
      } else if (role.name === ROLES.ADMIN) {
        errors.push({
          row: rowIndex,
          column: "Role",
          message: "Cannot assign Admin role via import",
        });
      } else {
        roleName = role.name;
        roleId = role.id;
      }
    }

    parsed.push({
      rowIndex,
      teamNumber,
      teamId,
      fullName: nameCol,
      cgCode: cgCol,
      nij: nijCol,
      email: emailCol,
      roleName: roleName ?? "",
      roleId: roleId ?? 0,
    });
  }

  return { errors, parsed };
}

export async function validateMembersCsv(
  csvText: string,
): Promise<ValidateMembersCsvResult> {
  const allowed = canAccess(await getUserRole(), [
    ROLES.ADMIN,
    ROLES.HEAD_MINISTRY,
    ROLES.REGIONAL_PIC,
  ]);
  if (!allowed) return { success: false, error: "Forbidden" };

  try {
    const { errors, parsed } = await validateAndParse(csvText);

    if (errors.length > 0) {
      return { success: true, errors };
    }

    const validRows = parsed.filter((r) => r.nij !== "");
    const nijs = validRows.map((r) => r.nij);

    const existingUsers = nijs.length > 0
      ? await db
          .select({
            id: users.id,
            fullName: users.fullName,
            nij: users.nij,
            email: users.email,
            cgCode: users.cgCode,
            teamId: users.teamId,
            roleId: users.roleId,
            roleName: roles.name,
          })
          .from(users)
          .leftJoin(roles, eq(users.roleId, roles.id))
          .where(inArray(users.nij, nijs))
      : [];

    const usersByNij = new Map(
      existingUsers.map((u) => [u.nij, u]),
    );

    const normalizedNewEmails = validRows.map((r) => r.email.trim().toLowerCase());
    const allUsersByEmail = normalizedNewEmails.length > 0
      ? await db
          .select({
            id: users.id,
            email: users.email,
            nij: users.nij,
          })
          .from(users)
          .where(inArray(users.email, normalizedNewEmails))
      : [];

    const emailOwnerNij = new Map(
      allUsersByEmail.map((u) => [u.email, u.nij]),
    );

    const preview: CsvRowPreview[] = [];
    const validationErrors: CsvValidationError[] = [];

    for (const row of parsed) {
      const normalizedEmail = row.email.trim().toLowerCase();
      const existing = usersByNij.get(row.nij);

      if (existing && existing.roleName === ROLES.ADMIN) {
        validationErrors.push({
          row: row.rowIndex,
          column: "NIJ",
          message: "Cannot modify Admin user via import",
        });
        continue;
      }

      const emailConflictNij = emailOwnerNij.get(normalizedEmail);
      if (emailConflictNij !== undefined && emailConflictNij !== row.nij) {
        validationErrors.push({
          row: row.rowIndex,
          column: "Email",
          message: `Email "${normalizedEmail}" already belongs to user with NIJ ${emailConflictNij}`,
        });
        continue;
      }

      if (!existing) {
        preview.push({
          rowIndex: row.rowIndex,
          status: "NEW",
          teamNumber: row.teamNumber,
          fullName: row.fullName.trim().toUpperCase(),
          cgCode: row.cgCode,
          nij: row.nij,
          email: normalizedEmail,
          roleName: row.roleName,
          changedFields: [],
        });
        continue;
      }

      const normalizedFullName = row.fullName.trim().toUpperCase();
      const changedFields: string[] = [];

      if (existing.fullName !== normalizedFullName) changedFields.push("Full Name");
      if ((existing.cgCode ?? "") !== row.cgCode) changedFields.push("CG");
      if (existing.email !== normalizedEmail) changedFields.push("Email");
      if (existing.teamId !== row.teamId) changedFields.push("Team");
      if (existing.roleId !== row.roleId) changedFields.push("Role");

      if (changedFields.length === 0) {
        preview.push({
          rowIndex: row.rowIndex,
          status: "NO_CHANGE",
          teamNumber: row.teamNumber,
          fullName: normalizedFullName,
          cgCode: row.cgCode,
          nij: row.nij,
          email: normalizedEmail,
          roleName: row.roleName,
          changedFields: [],
        });
      } else {
        preview.push({
          rowIndex: row.rowIndex,
          status: "UPDATED",
          teamNumber: row.teamNumber,
          fullName: normalizedFullName,
          cgCode: row.cgCode,
          nij: row.nij,
          email: normalizedEmail,
          roleName: row.roleName,
          changedFields,
        });
      }
    }

    if (validationErrors.length > 0) {
      return { success: true, errors: validationErrors };
    }

    return { success: true, preview };
  } catch (err) {
    console.error("[validateMembersCsv] error:", err);
    return { success: false, error: "Failed to validate CSV" };
  }
}

export async function importMembers(
  csvText: string,
): Promise<ImportMembersResult> {
  const allowed = canAccess(await getUserRole(), [
    ROLES.ADMIN,
    ROLES.HEAD_MINISTRY,
    ROLES.REGIONAL_PIC,
  ]);
  if (!allowed) return { success: false, error: "Forbidden" };

  try {
    const { errors, parsed } = await validateAndParse(csvText);
    if (errors.length > 0) {
      return { success: false, error: "Validation failed" };
    }

    const nijs = parsed.map((r) => r.nij);
    const existingUsers = nijs.length > 0
      ? await db
          .select({
            id: users.id,
            fullName: users.fullName,
            nij: users.nij,
            email: users.email,
            cgCode: users.cgCode,
            teamId: users.teamId,
            roleId: users.roleId,
            roleName: roles.name,
          })
          .from(users)
          .leftJoin(roles, eq(users.roleId, roles.id))
          .where(inArray(users.nij, nijs))
      : [];

    const usersByNij = new Map(
      existingUsers.map((u) => [u.nij, u]),
    );

    const ctx = await getUserContext();
    const now = new Date();
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of parsed) {
      const existing = usersByNij.get(row.nij);

      if (existing && existing.roleName === ROLES.ADMIN) {
        skipped++;
        continue;
      }

      const normalizedFullName = row.fullName.trim().toUpperCase();
      const normalizedEmail = row.email.trim().toLowerCase();
      const normalizedNij = row.nij.trim();

      if (!existing) {
        const pw = passwordFromEmail(normalizedEmail);
        const hashedPassword = await bcrypt.hash(pw, 10);

        await db
          .insert(users)
          .values({
            fullName: normalizedFullName,
            nij: normalizedNij,
            email: normalizedEmail,
            cgCode: row.cgCode,
            password: hashedPassword,
            teamId: row.teamId,
            roleId: row.roleId,
            createdAt: now,
            updatedAt: now,
            createdBy: ctx.userId,
            updatedBy: ctx.userId,
          });

        imported++;
      } else {
        const changedFields: string[] = [];
        const updateData: Record<string, unknown> = {
          updatedAt: now,
          updatedBy: ctx.userId,
        };

        if (existing.fullName !== normalizedFullName) {
          updateData.fullName = normalizedFullName;
          changedFields.push("fullName");
        }
        if ((existing.cgCode ?? "") !== row.cgCode) {
          updateData.cgCode = row.cgCode;
          changedFields.push("cgCode");
        }
        if (existing.email !== normalizedEmail) {
          updateData.email = normalizedEmail;
          changedFields.push("email");
        }
        if (existing.nij !== normalizedNij) {
          updateData.nij = normalizedNij;
          changedFields.push("nij");
        }
        if (existing.teamId !== row.teamId) {
          updateData.teamId = row.teamId;
          changedFields.push("teamId");
        }
        if (existing.roleId !== row.roleId) {
          updateData.roleId = row.roleId;
          changedFields.push("roleId");
        }

        if (changedFields.length > 0) {
          await db.update(users).set(updateData).where(eq(users.id, existing.id));
          updated++;
        } else {
          skipped++;
        }
      }
    }

    return { success: true, imported, updated, skipped };
  } catch (err) {
    console.error("[importMembers] error:", err);
    return { success: false, error: "Failed to import members" };
  }
}
