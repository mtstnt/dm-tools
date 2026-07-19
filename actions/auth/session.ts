"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { roles, teams, users } from "@/db/schema";
import { getCurrentUser } from "@/actions/auth/current-user";
import { getFirebaseCredentials } from "@/actions/auth/firebase-auth";

export type UserSession = {
  id: number;
  email: string;
  fullName: string;
  nij: string;
  role: string | null;
  teamId: number | null;
  regionId: number | null;
  firebaseCredentials?: string | null;
};

export async function getUserSession(): Promise<UserSession | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const userId = user.id;

  const rows = await db
    .select({
      roleName: roles.name,
      teamId: users.teamId,
      regionId: teams.regionId,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(teams, eq(users.teamId, teams.id))
    .where(eq(users.id, userId));

  const row = rows[0];
  const role = row?.roleName ?? null;
  const teamId = row?.teamId ?? null;
  const regionId = row?.regionId ?? null;

  const firebaseCredentials = await getFirebaseCredentials();

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    nij: user.nij,
    role,
    teamId,
    regionId,
    firebaseCredentials,
  };
}
