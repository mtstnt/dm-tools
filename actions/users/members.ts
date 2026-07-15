"use server";

import { db } from "@/db/connection";
import {
  permissions,
  roles,
  teams,
  userPermissions,
  users,
} from "@/db/schema";
import { getCurrentUser } from "@/actions/auth/current-user";
import { checkPermission, getUserContext, logAuditTrail } from "@/actions/master/_shared";
import { eq, asc, and, ne, inArray } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcrypt";

export type MemberUser = {
  id: number;
  fullName: string;
  nij: string;
  email: string;
  teamId: number | null;
  isSpv: boolean;
};

export type TeamWithMembers = {
  id: number;
  number: number;
  users: MemberUser[];
};

export type MembersResult = {
  success: boolean;
  data?: {
    teams: TeamWithMembers[];
    unassigned: MemberUser[];
  };
  error?: string;
};

export type UserDetail = {
  id: number;
  fullName: string;
  nij: string;
  email: string;
  sourceId: number | null;
  teamId: number | null;
  teamNumber: number | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  roles: {
    id: number;
    name: string;
  }[];
  additionalPermissions: {
    id: number;
    resource: string;
    action: string;
  }[];
};

export type UserDetailResult = {
  success: boolean;
  data?: UserDetail;
  error?: string;
};

const userSchema = z.object({
  fullName: z.string().min(1, "Full name is required").trim(),
  nij: z.string().min(1, "NIJ is required").trim(),
  email: z.string().min(1, "Email is required").email("Invalid email").trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  teamId: z.union([z.literal("null"), z.coerce.number().int().positive()]),
});

const updateUserSchema = z.object({
  fullName: z.string().min(1, "Full name is required").trim(),
  nij: z.string().min(1, "NIJ is required").trim(),
  email: z.string().min(1, "Email is required").email("Invalid email").trim(),
  password: z.string().optional(),
  teamId: z.union([z.literal("null"), z.coerce.number().int().positive()]),
});

export async function getTeamMembers(): Promise<MembersResult> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const [teamRows, userRows] = await Promise.all([
      db.select().from(teams),
      db
        .select({
          id: users.id,
          fullName: users.fullName,
          nij: users.nij,
          email: users.email,
          teamId: users.teamId,
          roleName: roles.name,
        })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .orderBy(asc(users.fullName)),
    ]);

    const toMemberUser = (u: (typeof userRows)[number]): MemberUser => ({
      id: u.id,
      fullName: u.fullName,
      nij: u.nij,
      email: u.email,
      teamId: u.teamId,
      isSpv: u.roleName === "SPV",
    });

    const unassigned: MemberUser[] = [];
    const usersByTeam = new Map<number, MemberUser[]>();

    for (const user of userRows) {
      const member = toMemberUser(user);
      if (user.teamId === null) {
        unassigned.push(member);
      } else {
        const list = usersByTeam.get(user.teamId) ?? [];
        list.push(member);
        usersByTeam.set(user.teamId, list);
      }
    }

    teamRows.sort((a, b) => a.number - b.number);

    const sortMembers = (a: MemberUser, b: MemberUser) => {
      if (a.isSpv !== b.isSpv) {
        return a.isSpv ? -1 : 1;
      }
      return a.fullName.localeCompare(b.fullName);
    };

    unassigned.sort(sortMembers);
    for (const list of usersByTeam.values()) {
      list.sort(sortMembers);
    }

    const teamsWithMembers: TeamWithMembers[] = teamRows.map((team) => ({
      id: team.id,
      number: team.number,
      users: usersByTeam.get(team.id) ?? [],
    }));

    return {
      success: true,
      data: {
        teams: teamsWithMembers,
        unassigned,
      },
    };
  } catch (err) {
    console.error("[getTeamMembers] error:", err);
    return { success: false, error: "Failed to load members" };
  }
}

export async function getUserDetail(id: number): Promise<UserDetailResult> {
  const allowed = await checkPermission("users", "read");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const userRows = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        nij: users.nij,
        email: users.email,
        sourceId: users.sourceId,
        teamId: users.teamId,
        teamNumber: teams.number,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        createdBy: users.createdBy,
        updatedBy: users.updatedBy,
        roleId: users.roleId,
        roleName: roles.name,
      })
      .from(users)
      .leftJoin(teams, eq(users.teamId, teams.id))
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, id))
      .limit(1);

    if (userRows.length === 0) {
      return { success: false, error: "User not found" };
    }

    const user = userRows[0];
    const auditUserIds = Array.from(
      new Set(
        [Number(user.createdBy), Number(user.updatedBy)].filter(Number.isFinite),
      ),
    );

    const [additionalPermissionRows, auditUserRows] = await Promise.all([
      db
        .select({
          id: permissions.id,
          resource: permissions.resource,
          action: permissions.action,
        })
        .from(userPermissions)
        .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
        .where(eq(userPermissions.userId, id))
        .orderBy(asc(permissions.resource), asc(permissions.action)),
      auditUserIds.length > 0
        ? db
            .select({
              id: users.id,
              fullName: users.fullName,
            })
            .from(users)
            .where(inArray(users.id, auditUserIds))
        : Promise.resolve([]),
    ]);

    const auditUsers = new Map(
      auditUserRows.map((row) => [String(row.id), row.fullName]),
    );

    return {
      success: true,
      data: {
        ...user,
        createdBy: auditUsers.get(user.createdBy) ?? null,
        updatedBy: auditUsers.get(user.updatedBy) ?? null,
        roles: user.roleId && user.roleName
          ? [{ id: user.roleId, name: user.roleName }]
          : [],
        additionalPermissions: additionalPermissionRows,
      },
    };
  } catch (err) {
    console.error("[getUserDetail] error:", err);
    return { success: false, error: "Failed to load user" };
  }
}

export type UserMutationResult = {
  success: boolean;
  error?: string;
};

export async function createUser(
  input: Record<string, string>,
): Promise<UserMutationResult> {
  const allowed = await checkPermission("users", "create");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const parseResult = userSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map((err) => err.message).join(", "),
    };
  }

  const { fullName, nij, email, password, teamId } = parseResult.data;
  const normalizedFullName = fullName.trim().toUpperCase();
  const normalizedNij = nij.trim();
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      return { success: false, error: "Email already exists" };
    }

    const ctx = await getUserContext();
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();
    const memberRoleRows = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, "Member"))
      .limit(1);

    if (memberRoleRows.length === 0) {
      return { success: false, error: 'Role "Member" is missing' };
    }

    const result = await db
      .insert(users)
      .values({
        fullName: normalizedFullName,
        nij: normalizedNij,
        email: normalizedEmail,
        password: hashedPassword,
        teamId: teamId === "null" ? null : teamId,
        roleId: memberRoleRows[0].id,
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      })
      .returning({ id: users.id });

    const row = result[0];
    await logAuditTrail("users", row.id, "create", {}, {
      fullName: normalizedFullName,
      nij: normalizedNij,
      email: normalizedEmail,
      teamId: teamId === "null" ? null : teamId,
    });

    return { success: true };
  } catch (err) {
    console.error("[createUser] error:", err);
    return { success: false, error: "Failed to create user" };
  }
}

export async function updateUser(
  id: number,
  input: Record<string, string>,
): Promise<UserMutationResult> {
  const allowed = await checkPermission("users", "update");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  const parseResult = updateUserSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map((err) => err.message).join(", "),
    };
  }

  const { fullName, nij, email, password, teamId } = parseResult.data;
  const normalizedFullName = fullName.trim().toUpperCase();
  const normalizedNij = nij.trim();
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existingRows = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        nij: users.nij,
        email: users.email,
        teamId: users.teamId,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (existingRows.length === 0) {
      return { success: false, error: "User not found" };
    }

    const existing = existingRows[0];

    const duplicateEmail = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, normalizedEmail), ne(users.id, id)))
      .limit(1);

    if (duplicateEmail.length > 0) {
      return { success: false, error: "Email already exists" };
    }

    const ctx = await getUserContext();
    const updateData: {
      fullName: string;
      nij: string;
      email: string;
      teamId: number | null;
      updatedAt: Date;
      updatedBy: string;
      password?: string;
    } = {
      fullName: normalizedFullName,
      nij: normalizedNij,
      email: normalizedEmail,
      teamId: teamId === "null" ? null : teamId,
      updatedAt: new Date(),
      updatedBy: ctx.userId,
    };

    if (password && password.length > 0) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await db.update(users).set(updateData).where(eq(users.id, id));

    await logAuditTrail("users", id, "update", existing, {
      fullName: normalizedFullName,
      nij: normalizedNij,
      email: normalizedEmail,
      teamId: teamId === "null" ? null : teamId,
    });

    return { success: true };
  } catch (err) {
    console.error("[updateUser] error:", err);
    return { success: false, error: "Failed to update user" };
  }
}

export async function deleteUser(id: number): Promise<UserMutationResult> {
  const allowed = await checkPermission("users", "delete");
  if (!allowed) {
    return { success: false, error: "Forbidden" };
  }

  try {
    const existingRows = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        nij: users.nij,
        email: users.email,
        teamId: users.teamId,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (existingRows.length === 0) {
      return { success: false, error: "User not found" };
    }

    const existing = existingRows[0];

    await db.delete(userPermissions).where(eq(userPermissions.userId, id));
    await db.delete(users).where(eq(users.id, id));

    await logAuditTrail("users", id, "delete", existing, {});

    return { success: true };
  } catch (err) {
    console.error("[deleteUser] error:", err);
    return { success: false, error: "Failed to delete user" };
  }
}
